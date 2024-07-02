from pathlib import Path
import docker
import logging
import shutil
import subprocess
from subprocess import CalledProcessError
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import io
import tarfile

pdf_to_html_image = 'pdf2htmlex/pdf2htmlex:0.18.8.rc2-master-20200820-ubuntu-20.04-x86_64'
alpine_image = 'alpine:latest'
volume_name = 'file_store'

origins = [
    "http://127.0.0.1:3000",  # Allow the React app
    "http://localhost:3000",  # Depending on how the React app is accessed
]


def check_docker_connection(docker_client):
    docker_client.ping()
    print("Successfully connected to the Docker daemon.")
 
def check_image_and_pull(client, image):
    try:
        client.images.get(image)
        print(f"Image {image} found locally.")
    except docker.errors.ImageNotFound:
        print(f"Image {image} not found locally. Attempting to pull...")
        client.images.pull(image)
        print(f"Image {image} pulled successfully.")
        
app = FastAPI()
docker_client = docker.from_env()



# Add CORSMiddleware to the application
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allow origins defined in the list
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)



# Check if Docker can connect to the Docker daemon
check_docker_connection(docker_client)

# Check if the image exists
check_image_and_pull(docker_client, pdf_to_html_image)
check_image_and_pull(docker_client, alpine_image)


def convert_pdf_to_html(pdf_file: str) -> None:

    container = docker_client.containers.run(
            image=pdf_to_html_image, # Using Alpine Linux for its small size
            command=['--zoom', '1.4', pdf_file],
            volumes={
                volume_name: {'bind': '/pdf', 'mode': 'rw'}
            },
            working_dir='/pdf',
            detach=True,
            remove=True
    )
  
    # Stream the logs
    for line in container.logs(stream=True, follow=True):
        print(line.decode('utf-8').strip())

    # Wait for the container to finish
    result = container.wait()

    if result['StatusCode'] != 0:
        print(f"Conversion failed with exit code: {result['StatusCode']}")
    else:
        print(f"Successfully converted {pdf_file}")


@app.post("/upload")
def upload_pdf(file: UploadFile = File(...)):

    print(f"File received: {file.filename}")
    
    volume = docker_client.volumes.get(volume_name)
    print(f"Volume {volume.name} found.")

    container = docker_client.containers.run(
        'alpine',  # Using Alpine Linux for its small size
        'sleep 3600',
        volumes={
            volume_name: {'bind': '/pdf', 'mode': 'rw'}
        },
        detach=True,
    )

    try:
        # Step 1: Create a tar archive in memory
        tar_stream = io.BytesIO()
        with tarfile.open(fileobj=tar_stream, mode='w') as tar:
            tarinfo = tarfile.TarInfo(name=file.filename)
            file.file.seek(0)  # Go to the start of the file-like object
            tarinfo.size = len(file.file.read())  # Set the size of the file
            file.file.seek(0)  # Go back to the start of the file-like object
            tar.addfile(tarinfo, fileobj=file.file)

        tar_stream.seek(0)  # Go to the start of the tar archive

        # Step 2: Use `put_archive` with the tar archive
        success = container.put_archive('/pdf', tar_stream.getvalue())

        if success:
            print("File uploaded successfully.")
        else:
            print("Failed to upload the file.")

        # Verify the file was copied
        _, output = container.exec_run('ls -l /pdf')
        print("Contents of /pdf:")
        print(output.decode())

    finally:
        # Clean up
        container.stop()
        container.remove()
        docker_client.close()

    try:
        convert_pdf_to_html(file.filename)
        print(f"Successfully converted {file.filename}")
        
    except Exception as e:
        print(f"Error converting {file.filename}: {e}")
        return {"error": f"Failed to convert {file.filename}"}
    
    container = docker_client.containers.run(
        'alpine',  # Using Alpine Linux for its small size
        'sleep 3600',
        volumes={
            volume_name: {'bind': '/pdf', 'mode': 'rw'}
        },
        detach=True,
    )
    
    try:
        html_file_name = file.filename.replace('.pdf', '.html')
        html_file_path = f"/pdf/{html_file_name}"

        print(f"Reading the converted HTML file: {html_file_path}")
        # Execute a command in the container to read the HTML file
        try:
            exec_result = container.exec_run(cmd=f"cat {html_file_path}")
        except Exception as e:
            print(f"Error executing command in container: {e}")
            raise HTTPException(status_code=500, detail="Error executing command in container.")

    finally:
        # Clean up
        container.stop()
        container.remove()
        docker_client.close()

    if exec_result.exit_code == 0:
        print("Successfully read the converted HTML file.")
        html_content = exec_result.output.decode("utf-8")
        return HTMLResponse(content=html_content)
    else:
        raise HTTPException(status_code=500, detail="Failed to read the converted HTML file.")

@app.get("/")
def read_root():
    return {"Tika Version": "I am working"}
