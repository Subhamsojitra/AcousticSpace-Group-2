"""Backend validation helpers.

These utilities keep validation logic consistent across API endpoints and services.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable, Set

from app.core.config import settings


def allowed_extension(filename: str, allowed_extensions: Iterable[str] | None = None) -> bool:
    """Check if a filename has an allowed extension."""

    ext = Path(filename).suffix.lower()
    allowed = settings.ALLOWED_EXTENSIONS.split(",")
    if allowed_extensions is not None:
        allowed = list(allowed_extensions)
    return ext in {e.strip().lower() for e in allowed if e.strip()}


def validate_file_size(size_bytes: int, max_size_bytes: int | None = None) -> None:
    """Validate an uploaded file size."""

    max_size = max_size_bytes if max_size_bytes is not None else settings.MAX_UPLOAD_SIZE
    if size_bytes > max_size:
        raise ValueError(f"File size exceeds limit: {max_size} bytes")


def ensure_upload_dir() -> Path:
    """Ensure upload directory exists."""

    path = Path(settings.UPLOAD_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def build_safe_upload_path(filename: str) -> Path:
    """Build an absolute upload path for a given filename."""

    upload_dir = ensure_upload_dir()
    return upload_dir / filename

