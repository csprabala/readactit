from pathlib import Path
import docker
import logging
import shutil
import subprocess
from subprocess import CalledProcessError
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://127.0.0.1:3000",  # Allow the React app
    "http://localhost:3000",  # Depending on how the React app is accessed
]

# Add CORSMiddleware to the application
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allow origins defined in the list
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)


def convert_pdf_to_html(pdf_file: str) -> None:
    # Preliminary check to see if Docker can connect to the Docker daemon
    try:
        subprocess.run(['docker', 'version'], check=True, capture_output=True)
        print("Docker daemon connection successful.")
    except CalledProcessError as e:
        print("Failed to connect to the Docker daemon. Please ensure Docker is running.")
        print(e.output.decode())
        return
    
    # check if the pdf file exists
    if not Path(f'{Path.cwd()}/uploaded_files/{pdf_file}').is_file():
        print(f"File {pdf_file} does not existu.")
        return
    else:
        print(f"File f'{Path.cwd()}/uploaded_files/{pdf_file}' exists.")

    # Construct the pdf2htmlEX command
    client = docker.from_env()
    
    image = 'pdf2htmlex/pdf2htmlex:0.18.8.rc2-master-20200820-ubuntu-20.04-x86_64'
    container = client.containers.run(
        image=image,
        command=[
            '--zoom', '1.3',
            f'{pdf_file}'
        ],
        remove=True,
        volumes={
            f'{Path.cwd()}/uploaded_files': {'bind': '/uploaded_files', 'mode': 'rw'}
        },
        working_dir='/uploaded_files'
    )
    print(container.decode())
        

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    logging.info(f"Starting upload for: {file.filename}")
    try:
        upload_dir = Path("./uploaded-files")
        upload_dir.mkdir(parents=True, exist_ok=True)
        with open(upload_dir / file.filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logging.info(f"Successfully saved {file.filename}")
        # return {"filename": file.filename}
    except Exception as e:
        logging.error(f"Error saving {file.filename}: {e}")
        return {"error": f"Failed to save {file.filename}"}

    pdf_file = file.filename

    try:
        convert_pdf_to_html(pdf_file)
        logging.info(f"Successfully converted {file.filename}")
        # return file content as xhtml response
        with open(upload_dir / f"{file.filename}.html", "r") as f:
            return f.read()
    except Exception as e:
        logging.error(f"Error converting {file.filename}: {e}")
        return {"error": f"Failed to convert {file.filename}"}

@app.get("/")
def read_root():
    return {"Tika Version": "I am working"}
