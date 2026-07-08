"""
Helper Utility Functions

This module contains reusable helper functions
used across the backend application.

Used by:
- api/
- services/
- database/
- future ml/
"""

import os
import uuid
from datetime import datetime
from pathlib import Path

from app.core.config import settings


# --------------------------------------------------------
# Generate Unique File Name
# --------------------------------------------------------
def generate_unique_filename(original_filename: str) -> str:
    """
    Generate a unique filename while preserving extension.

    Example:
        audio.wav
        ↓
        5d8f2d9a7f3a4f18.wav
    """

    extension = Path(original_filename).suffix.lower()

    unique_name = f"{uuid.uuid4().hex}{extension}"

    return unique_name


# --------------------------------------------------------
# Current Timestamp
# --------------------------------------------------------
def current_timestamp() -> str:
    """
    Returns current timestamp.
    """

    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# --------------------------------------------------------
# Validate File Extension
# --------------------------------------------------------
def is_allowed_file(filename: str) -> bool:
    """
    Check whether uploaded file extension is allowed.
    """

    extension = Path(filename).suffix.lower()

    allowed = settings.ALLOWED_EXTENSIONS.split(",")

    return extension in allowed


# --------------------------------------------------------
# Ensure Directory Exists
# --------------------------------------------------------
def ensure_directory(directory: str):
    """
    Create directory if it doesn't exist.
    """

    Path(directory).mkdir(
        parents=True,
        exist_ok=True
    )


# --------------------------------------------------------
# File Size
# --------------------------------------------------------
def get_file_size(file_path: str) -> float:
    """
    Return file size in MB.
    """

    if not os.path.exists(file_path):
        return 0.0

    size = os.path.getsize(file_path)

    return round(size / (1024 * 1024), 2)


# --------------------------------------------------------
# Format Processing Time
# --------------------------------------------------------
def format_processing_time(seconds: float) -> str:
    """
    Format processing time.

    Example:
        0.2345 -> "0.23 sec"
    """

    return f"{seconds:.2f} sec"


# --------------------------------------------------------
# Build Upload Path
# --------------------------------------------------------
def build_upload_path(filename: str) -> str:
    """
    Returns absolute upload path.
    """

    return os.path.join(
        settings.UPLOAD_DIR,
        filename
    )


# --------------------------------------------------------
# Build Feature Path
# --------------------------------------------------------
def build_feature_path(filename: str) -> str:
    """
    Returns feature file path.

    Example:
        audio.wav
        ↓
        audio.npy
    """

    base_name = Path(filename).stem

    return os.path.join(
        settings.FEATURE_DIR,
        f"{base_name}.npy"
    )


# --------------------------------------------------------
# Build Model Path
# --------------------------------------------------------
def build_model_path(model_name: str) -> str:
    """
    Returns model path.

    Example:
        cnn.pth
    """

    return os.path.join(
        settings.MODEL_DIR,
        model_name
    )


# --------------------------------------------------------
# Response Template
# --------------------------------------------------------
def success_response(
    message: str,
    data=None
):
    """
    Standard success response.
    """

    return {
        "success": True,
        "message": message,
        "data": data
    }


def error_response(
    message: str
):
    """
    Standard error response.
    """

    return {
        "success": False,
        "message": message
    }