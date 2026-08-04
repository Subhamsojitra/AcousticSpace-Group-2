"""Backend validation helpers.

These utilities keep validation logic consistent across API endpoints and services.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable, Set

from app.core.config import settings


def allowed_extension(filename: str, allowed_extensions: Iterable[str] | None = None, content_type: str | None = None) -> bool:
    """
    Check if a filename has an allowed extension.
    
    Parameters
    ----------
    filename : str
        The filename to check.
    allowed_extensions : Iterable[str], optional
        Custom list of allowed extensions. If None, uses settings.ALLOWED_EXTENSIONS.
    content_type : str, optional
        MIME type reported by the client/browser for logging purposes.
    
    Returns
    -------
    bool
        True if the extension is allowed, False otherwise.
    """
    ext = Path(filename).suffix.lower()
    allowed = settings.ALLOWED_EXTENSIONS.split(",")
    if allowed_extensions is not None:
        allowed = list(allowed_extensions)
    
    # Normalize allowed extensions to include dot
    allowed_normalized = set()
    for e in allowed:
        e = e.strip().lower()
        if e and not e.startswith('.'):
            e = f'.{e}'
        if e:
            allowed_normalized.add(e)
    
    is_allowed = ext in allowed_normalized
    
    if not is_allowed:
        from app.core.logger import log_error
        log_error(
            f"Unsupported file extension validation failed:\n"
            f"  Filename: {filename}\n"
            f"  Extension: {ext}\n"
            f"  Suffix: {Path(filename).suffix}\n"
            f"  Content-Type: {content_type}\n"
            f"  Allowed extensions: {sorted(allowed_normalized)}"
        )
    
    return is_allowed


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

