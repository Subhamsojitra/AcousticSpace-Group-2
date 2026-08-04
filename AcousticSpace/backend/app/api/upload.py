import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.api.schemas import DeleteResponse, UploadResponse
from app.core.config import settings
from app.core.exceptions import FileUploadError, FileNotFoundError
from app.core.logger import log_error, log_info, log_upload_completed, logger
from app.core.validation import InputValidator, validate_upload_request
from app.services.validation import allowed_extension, build_safe_upload_path, validate_file_size

router = APIRouter()

# Stream uploads in chunks to bound memory usage instead of loading the whole
# file into memory at once.
UPLOAD_CHUNK_SIZE = 1024 * 1024  # 1 MB


@router.post(
    "/",
    response_model=UploadResponse,
    summary="Upload audio file",
    description="Upload an audio file for analysis or prediction. Supports WAV, MP3, FLAC, OGG, and M4A formats.",
    responses={
        400: {"description": "Invalid file type, empty file, or file too large"},
        404: {"description": "Upload directory not found"},
        500: {"description": "Failed to store uploaded file"},
    }
)
async def upload_audio(file: UploadFile = File(..., description="Audio file to upload")) -> UploadResponse:
    """Upload an audio file.

    - Validates extension against `settings.ALLOWED_EXTENSIONS`.
    - Validates file size against `settings.MAX_UPLOAD_SIZE`.
    - Saves the uploaded file using a unique filename (streamed to disk).
    
    Parameters
    ----------
    file : UploadFile
        The audio file to upload.
        
    Returns
    -------
    UploadResponse
        Upload metadata including the generated filename.
        
    Raises
    ------
    FileUploadError
        If file validation fails or upload encounters an error.
    """

    # Validate file presence
    if not file.filename:
        raise FileUploadError(message="Missing filename.", detail="No filename provided in the upload request.")

    original_name = file.filename
    
    # Use centralized validation
    is_valid, error_msg = validate_upload_request(original_name, file.content_type)
    if not is_valid:
        raise FileUploadError(
            message=f"Upload validation failed: {error_msg}",
            detail=error_msg
        )
    
    # Additional filename safety check
    is_valid, sanitized, error = InputValidator.sanitize_filename(original_name)
    if not is_valid:
        raise FileUploadError(
            message="Invalid filename.",
            detail=error
        )

    extension = Path(original_name).suffix.lower()
    # Validate extension one more time
    is_valid, error = InputValidator.validate_audio_extension(original_name)
    if not is_valid:
        raise FileUploadError(
            message="Invalid file extension.",
            detail=error
        )
    
    unique_name = f"{uuid.uuid4().hex}{extension}"
    save_path = build_safe_upload_path(unique_name)

    total_size = 0
    try:
        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, "wb") as buffer:
            while True:
                chunk = await file.read(UPLOAD_CHUNK_SIZE)
                if not chunk:
                    break
                total_size += len(chunk)
                # Enforce max size while streaming to avoid storing oversized files.
                try:
                    validate_file_size(total_size)
                except ValueError as exc:
                    # Clean up partial file on validation failure
                    buffer.close()
                    if save_path.exists():
                        try:
                            save_path.unlink()
                        except OSError:
                            pass
                    raise FileUploadError(
                        message=str(exc),
                        detail=f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE} bytes ({settings.MAX_UPLOAD_SIZE / (1024*1024):.1f} MB)"
                    )
                buffer.write(chunk)
    except FileUploadError:
        raise
    except Exception as exc:
        log_error(f"Failed reading/writing upload stream: {exc}")
        # Clean up partial file on error
        if save_path.exists():
            try:
                save_path.unlink()
            except OSError:
                pass
        raise FileUploadError(
            message="Failed to store uploaded file.",
            detail=f"An error occurred while saving the file: {str(exc)}"
        )

    if total_size == 0:
        # Empty file - remove and reject
        try:
            save_path.unlink()
        except OSError:
            pass
        raise FileUploadError(
            message="Uploaded file is empty.",
            detail="The uploaded file contains no data."
        )

    log_upload_completed(unique_name, total_size)
    log_info(f"Uploaded file: {original_name} -> {unique_name}")

    return UploadResponse(
        message="Audio uploaded successfully.",
        data={
            "original_name": original_name,
            "size_bytes": total_size,
            "upload_dir": str(settings.UPLOAD_DIR),
        },
        file_name=unique_name,
        original_name=original_name,
        file_path=str(save_path),
        content_type=file.content_type,
        size_bytes=total_size,
    )


@router.get(
    "/",
    summary="List uploaded files",
    description="Get a list of all uploaded audio files with their metadata.",
    responses={
        200: {"description": "List of uploaded files"},
        500: {"description": "Failed to list files"},
    }
)
async def list_uploaded_files():
    """List uploaded audio files stored on the server.
    
    Returns
    -------
    dict
        Dictionary containing count and list of files with metadata.
    """

    try:
        upload_dir = Path(settings.UPLOAD_DIR)
        upload_dir.mkdir(parents=True, exist_ok=True)

        files: list[dict[str, object]] = []
        for p in sorted(upload_dir.iterdir()):
            if p.is_file():
                files.append({
                    "file_name": p.name, 
                    "size_bytes": p.stat().st_size,
                    "modified_at": p.stat().st_mtime
                })

        return {
            "success": True,
            "message": "Files retrieved successfully.",
            "data": {
                "upload_dir": str(settings.UPLOAD_DIR),
            },
            "count": len(files), 
            "files": files
        }
    except Exception as exc:
        log_error(f"Failed to list uploaded files: {exc}")
        raise HTTPException(status_code=500, detail="Failed to list uploaded files.")


@router.delete(
    "/{filename}",
    response_model=DeleteResponse,
    summary="Delete uploaded file",
    description="Delete a specific uploaded audio file by its filename.",
    responses={
        400: {"description": "Invalid filename"},
        404: {"description": "File not found"},
        500: {"description": "Failed to delete file"},
    }
)
async def delete_uploaded_file(filename: str) -> DeleteResponse:
    """Delete a stored uploaded file.
    
    Parameters
    ----------
    filename : str
        The filename of the uploaded file to delete.
        
    Returns
    -------
    DeleteResponse
        Confirmation message.
        
    Raises
    ------
    FileNotFoundError
        If the file does not exist.
    FileUploadError
        If the filename is invalid or deletion fails.
    """

    upload_dir = Path(settings.UPLOAD_DIR)
    file_path = upload_dir / filename

    # Basic path traversal guard: ensure path remains within upload_dir.
    try:
        file_path_resolved = file_path.resolve(strict=False)
        upload_dir_resolved = upload_dir.resolve(strict=False)
        
        # Check if the resolved path is within the upload directory
        if not str(file_path_resolved).startswith(str(upload_dir_resolved) + os.sep) and file_path_resolved != upload_dir_resolved:
            raise FileUploadError(
                message="Invalid filename.",
                detail="Path traversal detected. Filename must not contain '..' or absolute paths."
            )
    except FileUploadError:
        raise
    except Exception as exc:
        log_error(f"Path validation error: {exc}")
        raise FileUploadError(message="Invalid filename.", detail="Filename validation failed.")

    if not file_path.exists():
        raise FileNotFoundError(
            message="File not found.",
            detail=f"The file '{filename}' does not exist in the upload directory."
        )

    try:
        file_path.unlink()
        log_info(f"Deleted file: {filename}")
    except Exception as exc:
        logger.error("file_delete_failed", extra={"deleted_file": filename, "error": str(exc)})
        raise FileUploadError(
            message="Failed to delete file.",
            detail=f"An error occurred while deleting the file: {str(exc)}"
        )

    return DeleteResponse(
        message="File deleted successfully.",
        data={
            "deleted_file": filename,
            "file_path": str(file_path),
        }
    )

