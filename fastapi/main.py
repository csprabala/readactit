from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import logging
import subprocess

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

from pathlib import Path

def convert_pdf_to_html(pdf_path: str, output_dir: str) -> None:
    # Construct the pdf2htmlEX command
    command = [
        'pdf2htmlEX',
        '--embed', 'cfijo',
        '--dest-dir', output_dir,
        pdf_path
    ]
    
    # Execute the command
    subprocess.run(command, check=True)

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    logging.info(f"Starting upload for: {file.filename}")
    try:
        upload_dir = Path("./uploaded_files")
        upload_dir.mkdir(parents=True, exist_ok=True)
        with open(upload_dir / file.filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logging.info(f"Successfully saved {file.filename}")
        # return {"filename": file.filename}
    except Exception as e:
        logging.error(f"Error saving {file.filename}: {e}")
        return {"error": f"Failed to save {file.filename}"}

    pdf_path = upload_dir / file.filename
    output_dir = Path("./converted_files") / file.filename

    try:
        convert_pdf_to_html(str(pdf_path), str(output_dir))
        logging.info(f"Successfully converted {file.filename}")
        # return file content as xhtml response
        with open(output_dir / f"{file.filename}.html", "r") as f:
            return f.read()
    except Exception as e:
        logging.error(f"Error converting {file.filename}: {e}")
        return {"error": f"Failed to convert {file.filename}"}

@app.get("/")
def read_root():
    return {"Tika Version": "I am working"}
