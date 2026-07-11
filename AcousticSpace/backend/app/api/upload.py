import os
from pathlib import Path
import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.api.schemas import DeleteResponse, UploadResponse
from app.core.config import settings
from app.core.logger import log_error, log_info, logger
from app.services.validation import allowed_extension, build_safe_upload_path, validate_file_size

router = APIRouter()


@router.post("/", response_model=UploadResponse)
async def upload_audio(file: UploadFile = File(...)) -> UploadResponse:
    """Upload an audio file.

    - Validates extension against `settings.ALLOWED_EXTENSIONS`.
    - Validates file size against `settings.MAX_UPLOAD_SIZE`.
    - Saves the uploaded file using a unique filename.
    """

    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")

    original_name = file.filename
    if not allowed_extension(original_name):
        ext = Path(original_name).suffix.lower()
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    # Read uploaded content (project uses in-memory read).
    try:
        contents = await file.read()
    except Exception as exc:
        log_error(f"Failed reading upload stream: {exc}")
        raise HTTPException(status_code=400, detail="Unable to read uploaded file.")

    try:
        validate_file_size(len(contents))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    extension = Path(original_name).suffix.lower()
    unique_name = f"{uuid.uuid4().hex}{extension}"
    save_path = build_safe_upload_path(unique_name)

    try:
        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as exc:
        log_error(f"Failed writing upload to disk: {exc}")
        raise HTTPException(status_code=500, detail="Failed to store uploaded file.")

    log_info(f"Uploaded file: {original_name} -> {unique_name}")

    return UploadResponse(
        message="Audio uploaded successfully.",
        file_name=unique_name,
        original_name=original_name,
        file_path=str(save_path),
        content_type=file.content_type,
        size_bytes=len(contents),
    )


@router.get("/", tags=["Upload"])
async def list_uploaded_files():
    """List uploaded audio files stored on the server."""

    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    files: list[dict[str, object]] = []
    for p in upload_dir.iterdir():
        if p.is_file():
            files.append({"file_name": p.name, "size_bytes": p.stat().st_size})

    return {"count": len(files), "files": files}


@router.delete("/{filename}", response_model=DeleteResponse)
async def delete_uploaded_file(filename: str) -> DeleteResponse:
    """Delete a stored uploaded file."""

    upload_dir = Path(settings.UPLOAD_DIR)
    file_path = upload_dir / filename

    # Basic path traversal guard: ensure path remains within upload_dir.
    try:
        file_path_resolved = file_path.resolve(strict=False)
        if upload_dir.resolve(strict=False) not in file_path_resolved.parents and file_path_resolved != upload_dir:
            raise HTTPException(status_code=400, detail="Invalid filename.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found.")

    try:
        file_path.unlink()
    except Exception as exc:
        logger.error("file_delete_failed", extra={"filename": filename, "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to delete file.")

    return DeleteResponse(message="File deleted successfully.")

