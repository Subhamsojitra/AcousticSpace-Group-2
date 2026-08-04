"""Request validation utilities for AcousticSpace API.

This module provides centralized validation functions for:
- File path validation
- Filename sanitization
- Input sanitization
- Security checks
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Optional

from app.core.config import settings


class InputValidator:
    """Centralized input validation utilities."""

    @staticmethod
    def validate_file_path(file_path: str, must_exist: bool = True) -> tuple[bool, Optional[str]]:
        """
        Validate a file path for security and correctness.
        
        Parameters
        ----------
        file_path : str
            The file path to validate.
        must_exist : bool
            Whether the file must exist on disk.
            
        Returns
        -------
        tuple[bool, Optional[str]]
            (is_valid, error_message)
        """
        if not file_path or not file_path.strip():
            return False, "File path cannot be empty."
        
        file_path = file_path.strip()
        
        # Check for path traversal attempts
        if ".." in file_path:
            return False, "Path traversal detected. '..' is not allowed in file paths."
        
        # Check for null bytes
        if "\x00" in file_path:
            return False, "Invalid file path. Null bytes are not allowed."
        
        # Validate path length
        if len(file_path) > 4096:
            return False, "File path is too long. Maximum length is 4096 characters."
        
        # Check if file exists if required
        if must_exist:
            path = Path(file_path)
            if not path.exists():
                return False, f"File does not exist: {file_path}"
            
            if not path.is_file():
                return False, f"Path is not a file: {file_path}"
        
        return True, None

    @staticmethod
    def sanitize_filename(filename: str) -> tuple[bool, Optional[str], Optional[str]]:
        """
        Sanitize a filename for safe storage.
        
        Parameters
        ----------
        filename : str
            The filename to sanitize.
            
        Returns
        -------
        tuple[bool, Optional[str], Optional[str]]
            (is_valid, sanitized_filename, error_message)
        """
        if not filename or not filename.strip():
            return False, None, "Filename cannot be empty."
        
        filename = filename.strip()
        
        # Check filename length
        if len(filename) > settings.MAX_FILENAME_LENGTH:
            return False, None, f"Filename is too long. Maximum length is {settings.MAX_FILENAME_LENGTH} characters."
        
        # Check for path traversal attempts
        if ".." in filename or "/" in filename or "\\" in filename:
            return False, None, "Invalid filename. Path separators and '..' are not allowed."
        
        # Check for null bytes
        if "\x00" in filename:
            return False, None, "Invalid filename. Null bytes are not allowed."
        
        # Remove any potentially dangerous characters
        # Allow: alphanumeric, dots, hyphens, underscores
        sanitized = re.sub(r'[^a-zA-Z0-9._\-]', '_', filename)
        
        # Ensure filename is not empty after sanitization
        if not sanitized or sanitized == ".":
            return False, None, "Invalid filename. Filename contains no valid characters."
        
        # Check if extension is present
        if "." not in sanitized:
            return False, None, "Invalid filename. No file extension found."
        
        return True, sanitized, None

    @staticmethod
    def validate_audio_extension(filename: str) -> tuple[bool, Optional[str]]:
        """
        Validate that a filename has an allowed audio extension.
        
        Parameters
        ----------
        filename : str
            The filename to validate.
            
        Returns
        -------
        tuple[bool, Optional[str]]
            (is_valid, error_message)
        """
        if not filename:
            return False, "Filename is empty."
        
        ext = Path(filename).suffix.lower()
        allowed = [e.strip().lower() for e in settings.ALLOWED_EXTENSIONS.split(",")]
        
        # Normalize extensions to include dot
        allowed_normalized = []
        for e in allowed:
            if e and not e.startswith('.'):
                allowed_normalized.append(f'.{e}')
            else:
                allowed_normalized.append(e)
        
        if ext not in allowed_normalized:
            return False, f"Unsupported file extension: {ext}. Allowed extensions: {', '.join(allowed_normalized)}"
        
        return True, None

    @staticmethod
    def validate_request_id(request_id: Optional[str]) -> tuple[bool, Optional[str]]:
        """
        Validate a request ID for format and length.
        
        Parameters
        ----------
        request_id : Optional[str]
            The request ID to validate.
            
        Returns
        -------
        tuple[bool, Optional[str]]
            (is_valid, error_message)
        """
        if not request_id:
            return True, None  # Request ID is optional
        
        if len(request_id) > 128:
            return False, "Request ID is too long. Maximum length is 128 characters."
        
        # Allow only alphanumeric, hyphens, and underscores
        if not re.match(r'^[a-zA-Z0-9\-_]+$', request_id):
            return False, "Invalid request ID format. Only alphanumeric characters, hyphens, and underscores are allowed."
        
        return True, None

    @staticmethod
    def sanitize_string(value: str, max_length: int = 1000, allow_empty: bool = False) -> tuple[bool, Optional[str], Optional[str]]:
        """
        Sanitize a general string input.
        
        Parameters
        ----------
        value : str
            The string to sanitize.
        max_length : int
            Maximum allowed length.
        allow_empty : bool
            Whether empty strings are allowed.
            
        Returns
        -------
        tuple[bool, Optional[str], Optional[str]]
            (is_valid, sanitized_value, error_message)
        """
        if not value and not allow_empty:
            return False, None, "Value cannot be empty."
        
        value = value.strip()
        
        if len(value) > max_length:
            return False, None, f"Value is too long. Maximum length is {max_length} characters."
        
        # Remove null bytes
        if "\x00" in value:
            return False, None, "Invalid input. Null bytes are not allowed."
        
        return True, value, None


def validate_upload_request(
    filename: Optional[str],
    content_type: Optional[str] = None
) -> tuple[bool, Optional[str]]:
    """
    Validate an upload request.
    
    Parameters
    ----------
    filename : Optional[str]
        The filename from the upload.
    content_type : Optional[str]
        The content type from the upload.
        
    Returns
    -------
    tuple[bool, Optional[str]]
        (is_valid, error_message)
    """
    if not filename:
        return False, "Missing filename."
    
    # Validate extension
    is_valid, error = InputValidator.validate_audio_extension(filename)
    if not is_valid:
        return False, error
    
    # Sanitize filename
    is_valid, sanitized, error = InputValidator.sanitize_filename(filename)
    if not is_valid:
        return False, error
    
    return True, None


def validate_prediction_request(file_path: str) -> tuple[bool, Optional[str]]:
    """
    Validate a prediction request.
    
    Parameters
    ----------
    file_path : str
        The file path to validate.
        
    Returns
    -------
    tuple[bool, Optional[str]]
        (is_valid, error_message)
    """
    is_valid, error = InputValidator.validate_file_path(file_path, must_exist=True)
    if not is_valid:
        return False, error
    
    # Validate that it's an audio file
    is_valid, error = InputValidator.validate_audio_extension(file_path)
    if not is_valid:
        return False, error
    
    return True, None


def validate_analysis_request(file_path: str) -> tuple[bool, Optional[str]]:
    """
        Validate an analysis request.
        
        Parameters
        ----------
        file_path : str
            The file path to validate.
            
        Returns
        -------
        tuple[bool, Optional[str]]
            (is_valid, error_message)
        """
    is_valid, error = InputValidator.validate_file_path(file_path, must_exist=True)
    if not is_valid:
        return False, error
    
    # Validate that it's an audio file
    is_valid, error = InputValidator.validate_audio_extension(file_path)
    if not is_valid:
        return False, error
    
    return True, None