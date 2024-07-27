from pathlib import Path
import docker
import logging
import shutil
import subprocess
from subprocess import CalledProcessError
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import io
import tarfile
import re
from lxml import etree
from typing import List
import marvin
from dotenv import load_dotenv

load_dotenv()

pdf_to_html_image = 'pdf2htmlex/pdf2htmlex:0.18.8.rc2-master-20200820-ubuntu-20.04-x86_64'
alpine_image = 'alpine:latest'
volume_name = 'file_store'

origins = [
    "http://127.0.0.1:3000",  # Allow the React app
    "http://localhost:3000",  # Depending on how the React app is accessed
]

# Simple global cache
cache = {}

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

def extract_text_from_html(html_content: str) -> str:
    # Parse the XHTML content
    parser = etree.HTMLParser(recover=True)  # This allows it to recover from errors
    tree = etree.fromstring(html_content.encode('utf-8'), parser)

    # Remove the head element if it exists
    head = tree.find('.//head')
    if head is not None:
        head.getparent().remove(head)

    # Define a function to recursively extract text
    def extract_text(element):
        text = element.text or ''
        for child in element:
            if child.tag not in ['script', 'style', 'img']:  # Ignore script and style tags
                text += extract_text(child)
            if child.tail:
                text += child.tail
        return text

    # Extract all text
    all_text = extract_text(tree)

    # Clean up the text
    all_text = re.sub(r'\s+', ' ', all_text)  # Replace multiple whitespace with single space
    all_text = all_text.strip()  # Remove leading/trailing whitespace

    return all_text

@app.post("/pdf-text")
async def receive_pdf_text(request: Request):
    body = await request.json()
    text = body.get('text', '')
    cache['text_only'] = text
    return {"message": "Text received successfully."}

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

    if exec_result.exit_code != 0:
        raise HTTPException(status_code=500, detail="Failed to read the converted HTML file.")
    
    print("Successfully read the converted HTML file.")
    html_content = exec_result.output.decode("utf-8")

    text_content = extract_text_from_html(html_content)
    print(text_content)
    cache['text_only'] = text_content

    print("Successfully extracted text from the HTML content.")

    return HTMLResponse(content=html_content)

@marvin.fn
def extract_redactable_entities(direction: str, text: str) -> List[str]:
    """
    use the direction provided below to extract a list of elements from the text that confirm to the direction
    direction: `direction`
    text: `text`
    """

def classify_text(text: str) -> bool:
    return marvin.classify(text, labels=bool)

@app.get("/ai-response")
def get_ai_response(query: str):
    if(cache.get('text_only') == None):
        return HTTPException(status_code=500, detail="No text content found. Please upload a PDF file first.")
    
    text = cache['text_only']
    words = text.split()
    chunks = [' '.join(words[i:i + 1000]) for i in range(0, len(words), 1000)]
    
    responses = []
    for chunk in chunks:
        response = extract_redactable_entities(direction=query, text=chunk)
        responses.append(response)

    # flatten the list of lists, drop empty lists
    responses = [item for sublist in responses for item in sublist if item]

    # Aggregate the results
    aggregated_response = {
        'response': responses
    }
    
    return aggregated_response

@app.get("/")
def read_root():
    return {"Tika Version": "I am working"}
