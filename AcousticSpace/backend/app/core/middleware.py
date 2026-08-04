"""FastAPI middleware for AcousticSpace.

Contains production-oriented middleware:
- Request logging with request-id
- Exception handling that returns consistent JSON

These middleware are intentionally framework-agnostic and reusable.
"""

from __future__ import annotations

import time
import uuid
from typing import Callable

from fastapi import HTTPException, Request, Response
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.exceptions import AcousticSpaceException
from app.core.logger import logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs each request/response with latency and a request-id."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Response],
    ) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        start = time.perf_counter()
        response = None
        exception_occurred = False

        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            # Log unhandled exceptions in the middleware chain
            exception_occurred = True
            duration_ms = (time.perf_counter() - start) * 1000.0
            logger.error(
                "request_failed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "query": str(request.url.query),
                    "duration_ms": round(duration_ms, 2),
                    "client": request.client.host if request.client else None,
                    "error": str(exc),
                },
            )
            raise
        finally:
            # Log request completion (success or failure)
            duration_ms = (time.perf_counter() - start) * 1000.0
            status_code = getattr(response, "status_code", 500 if exception_occurred else None)
            
            logger.info(
                "request",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "query": str(request.url.query),
                    "status_code": status_code,
                    "duration_ms": round(duration_ms, 2),
                    "client": request.client.host if request.client else None,
                },
            )

        # Ensure request-id propagates to client
        if response:
            response.headers["x-request-id"] = request_id
        return response


class ExceptionLoggingMiddleware(BaseHTTPMiddleware):
    """Converts unexpected errors into a consistent JSON response."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Response],
    ) -> Response:
        try:
            return await call_next(request)
        except (HTTPException, StarletteHTTPException):
            # Let FastAPI's exception handlers produce the standardized response
            # for known HTTP errors (raised in endpoints).
            raise
        except AcousticSpaceException:
            # Let FastAPI's exception handlers produce the standardized response
            # for AcousticSpace-specific exceptions.
            raise
        except Exception as exc:  # pragma: no cover
            logger.exception(
                "unhandled_exception",
                extra={
                    "path": request.url.path,
                    "method": request.method,
                    "client": request.client.host if request.client else None,
                    "error": str(exc),
                },
            )
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": "Internal server error.",
                    "detail": "An unexpected error occurred. Please contact support if the problem persists.",
                    "error_code": 500,
                },
            )

