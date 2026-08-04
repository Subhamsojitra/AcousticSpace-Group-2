"""Centralized exception handlers for AcousticSpace API.

This module provides custom exception classes and handlers to ensure
consistent error responses across all endpoints.
"""

from __future__ import annotations

from typing import Any


class AcousticSpaceException(Exception):
    """Base exception for AcousticSpace-specific errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        detail: str | None = None,
        error_code: int | None = None,
    ):
        self.message = message
        self.status_code = status_code
        self.detail = detail or message
        self.error_code = error_code or status_code
        super().__init__(self.message)


class ValidationError(AcousticSpaceException):
    """Raised when request validation fails."""

    def __init__(self, message: str, detail: str | None = None):
        super().__init__(
            message=message,
            status_code=422,
            detail=detail or message,
            error_code=422,
        )


class FileUploadError(AcousticSpaceException):
    """Raised when file upload fails."""

    def __init__(self, message: str, detail: str | None = None):
        super().__init__(
            message=message,
            status_code=400,
            detail=detail or message,
            error_code=400,
        )


class FileNotFoundError(AcousticSpaceException):
    """Raised when a requested file is not found."""

    def __init__(self, message: str = "File not found", detail: str | None = None):
        super().__init__(
            message=message,
            status_code=404,
            detail=detail or message,
            error_code=404,
        )


class ModelNotReadyError(AcousticSpaceException):
    """Raised when ML model is not ready for prediction."""

    def __init__(self, message: str = "Model not ready", detail: str | None = None):
        super().__init__(
            message=message,
            status_code=503,
            detail=detail or message,
            error_code=503,
        )


class AudioValidationError(AcousticSpaceException):
    """Raised when audio file validation fails."""

    def __init__(self, message: str, detail: str | None = None):
        super().__init__(
            message=message,
            status_code=400,
            detail=detail or message,
            error_code=400,
        )


class DatabaseError(AcousticSpaceException):
    """Raised when database operations fail."""

    def __init__(self, message: str, detail: str | None = None):
        super().__init__(
            message=message,
            status_code=500,
            detail=detail or message,
            error_code=500,
        )


class ProcessingError(AcousticSpaceException):
    """Raised when audio processing fails."""

    def __init__(self, message: str, detail: str | None = None):
        super().__init__(
            message=message,
            status_code=500,
            detail=detail or message,
            error_code=500,
        )


def format_error_response(
    success: bool = False,
    message: str = "",
    detail: str = "",
    error_code: int = 500,
) -> dict[str, Any]:
    """
    Format a standardized error response.

    Parameters
    ----------
    success : bool
        Always False for error responses.
    message : str
        Human-readable error message.
    detail : str
        Detailed error information.
    error_code : int
        HTTP status code.

    Returns
    -------
    dict[str, Any]
        Standardized error response dictionary.
    """
    return {
        "success": success,
        "message": message,
        "detail": detail,
        "error_code": error_code,
    }


def format_success_response(
    success: bool = True,
    message: str = "",
    data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Format a standardized success response.

    Parameters
    ----------
    success : bool
        Always True for success responses.
    message : str
        Human-readable success message.
    data : dict[str, Any] | None
        Response data payload.

    Returns
    -------
    dict[str, Any]
        Standardized success response dictionary.
    """
    return {
        "success": success,
        "message": message,
        "data": data or {},
    }