from fastapi import FastAPI, Query, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="xfcs-dearchiver API", version="0.1.0")

# Dev CORS; tighten in prod
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LotIdResult(BaseModel):
    id: str
    name: str


class LotIdQueryResponse(BaseModel):
    query: str
    results: List[LotIdResult] = []


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/lotid", response_model=LotIdQueryResponse)
def ask_lotid(q: str = Query(..., min_length=1, max_length=128)):
    # TODO: Port logic from cgi-bin/0_0_ask_lotid.cgi
    return LotIdQueryResponse(query=q, results=[])


@app.get("/api/files/{file_id}")
def download_file(file_id: str):
    # TODO: Map to real file path based on legacy logic
    path = f"/data/archive/{file_id}.zip"
    try:
        return FileResponse(path, media_type="application/zip", filename=f"{file_id}.zip")
    except Exception as e:
        raise HTTPException(status_code=404, detail="File not found") from e


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    # TODO: Handle and store upload
    return {"filename": file.filename}
