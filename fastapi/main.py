from fastapi import FastAPI
import requests

app = FastAPI()

TIKA_SERVER = "http://tika:9998"

@app.get("/")
def read_root():
    response = requests.get(f"{TIKA_SERVER}/version")
    return {"Tika Version": response.text}