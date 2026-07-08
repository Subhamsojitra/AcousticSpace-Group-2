import os
import uuid
import shutil
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter()

# -----------------------------
# Configuration
# -----------------------------
UPLOAD_DIR = "backend/uploads"

ALLOWED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".flac",
    ".ogg",
    ".m4a"
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


# -----------------------------
# Upload Audio
# -----------------------------
@router.post("/")
async def upload_audio(file: UploadFile = File(...)):
    """
    Upload an audio file.
    """

    # Check extension
    extension = os.path.splitext(file.filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {extension}"
        )

    # Read file
    contents = await file.read()

    # Validate size
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 50 MB."
        )

    # Generate unique filename
    unique_name = f"{uuid.uuid4()}{extension}"

    save_path = os.path.join(
        UPLOAD_DIR,
        unique_name
    )

    # Save file
    with open(save_path, "wb") as buffer:
        buffer.write(contents)

    return {
        "success": True,
        "message": "Audio uploaded successfully.",
        "file_name": unique_name,
        "original_name": file.filename,
        "file_path": save_path,
        "content_type": file.content_type,
        "size_bytes": len(contents)
    }


# -----------------------------
# List Uploaded Files
# -----------------------------
@router.get("/")
async def list_uploaded_files():

    files = []

    for filename in os.listdir(UPLOAD_DIR):

        path = os.path.join(
            UPLOAD_DIR,
            filename
        )

        files.append(
            {
                "file_name": filename,
                "size_bytes": os.path.getsize(path)
            }
        )

    return {
        "count": len(files),
        "files": files
    }


# -----------------------------
# Delete Uploaded File
# -----------------------------
@router.delete("/{filename}")
async def delete_uploaded_file(filename: str):

    file_path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="File not found."
        )

    os.remove(file_path)

    return {
        "success": True,
        "message": "File deleted successfully."
    }