from contextlib import asynccontextmanager
import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.upload import router as upload_router
from app.api.predict import router as predict_router
from app.api.analysis import router as analysis_router
from app.api.history import router as history_router

from app.core.config import settings
from app.core.exceptions import AcousticSpaceException
from app.core.logger import log_startup_complete, logger
from app.core.middleware import ExceptionLoggingMiddleware, RequestLoggingMiddleware
from app.database.db import Base, engine
# -----------------------------
# Application Lifecycle
# -----------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""

    startup_start = time.perf_counter()
    logger.info("=" * 60)
    logger.info("AcousticSpace backend starting...")
    logger.info("=" * 60)

    # Step 1: Ensure required runtime folders exist
    t0 = time.perf_counter()
    from pathlib import Path
    for p in [settings.UPLOAD_DIR, settings.FEATURE_DIR, settings.MODEL_DIR, settings.LOG_DIR]:
        Path(p).mkdir(parents=True, exist_ok=True)
    
    # Ensure database directory exists
    db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    t_folders = time.perf_counter() - t0
    logger.info(f"✓ Runtime folders ensured in {t_folders:.3f}s")

    # Step 2: Initialize DB tables
    t0 = time.perf_counter()
    Base.metadata.create_all(bind=engine)
    t_db = time.perf_counter() - t0
    logger.info(f"✓ Database tables initialized in {t_db:.3f}s")

    # Step 3: Initialize app state for ML model integration
    # NOTE: Model loading is now LAZY - happens on first prediction/analysis request
    app.state.cnn_model = None
    app.state.ast_model = None
    app.state.feature_extractor = None
    app.state.model_ready = False
    app.state.model_loading = False
    logger.info("✓ App state initialized (model will load on first prediction/analysis request)")
    
    # Step 3b: Log AST model configuration (lightweight, no file I/O)
    logger.info("=" * 60)
    logger.info("AST Model Configuration:")
    logger.info(f"  Model path: {settings.AST_MODEL_PATH}")
    logger.info(f"  Model loading: Deferred (lazy loading enabled)")
    logger.info("=" * 60)

    total_startup = time.perf_counter() - startup_start
    logger.info("=" * 60)
    logger.info("Backend startup summary")
    logger.info(f"  Database .......... {t_db*1000:.2f} ms")
    logger.info(f"  Folders ........... {t_folders*1000:.2f} ms")
    logger.info(f"  ML imports ........ Deferred")
    logger.info(f"  Model loading ..... Deferred")
    logger.info(f"  Total startup ..... {total_startup:.3f}s")
    logger.info("=" * 60)
    logger.info(f"✓ Startup completed in {total_startup:.3f}s")
    logger.info(f"  (AST model will load on first prediction request)")
    logger.info("=" * 60)

    log_startup_complete(total_startup)

    yield

    logger.info("AcousticSpace backend stopped.")


# -----------------------------
# FastAPI App
# -----------------------------
app = FastAPI(
    title=settings.APP_NAME,
    description="""Backend API for Deepfake Audio Detection using Room Impulse Response (RIR).

## Features
- **Audio Upload**: Upload audio files (WAV, MP3, FLAC, OGG, M4A) for analysis
- **Audio Analysis**: Comprehensive audio analysis including feature extraction, RIR analysis, breathing analysis, and cadence alignment
- **Prediction**: AI-powered prediction using AST (Audio Spectrogram Transformer) model to detect deepfake audio
- **History**: Track and manage all analysis and prediction history

## Authentication
Currently, this API does not require authentication. In production, implement API key or OAuth2 authentication.

## Rate Limiting
No rate limiting is currently implemented. Consider adding rate limiting for production deployments.

## Support
For issues or questions, please contact the development team.
""",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "AcousticSpace Team",
        "email": "support@acousticspace.example.com",
    },
    license_info={
        "name": "Proprietary",
        "url": "https://acousticspace.example.com/license",
    },
    servers=[
        {
            "url": "http://localhost:8000",
            "description": "Development server",
        },
        {
            "url": "http://0.0.0.0:8000",
            "description": "Development server (all interfaces)",
        },
    ],
)

# -----------------------------
# CORS Configuration
# -----------------------------
# NOTE: keep origins configurable for production deployments.
allow_origins = [o.strip() for o in settings.CORS_ALLOW_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Middleware
# -----------------------------
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(ExceptionLoggingMiddleware)


# -----------------------------
# Global Exception Handlers
# -----------------------------
# These produce standardized JSON error responses while preserving the
# `detail` field for backward compatibility with the frontend.
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTPException raised in endpoints with a standardized body."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": str(exc.detail),
            "detail": exc.detail,
            "error_code": exc.status_code,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation errors with a standardized body."""
    errors = exc.errors()
    message = "Invalid request."
    if errors:
        first = errors[0]
        loc = ".".join(str(x) for x in first.get("loc", []) if x != "body")
        message = f"{loc}: {first.get('msg', 'invalid value')}" if loc else first.get("msg", "invalid value")
    logger.warning("validation_error", extra={"path": request.url.path, "errors": errors})
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": message,
            "detail": errors,
            "error_code": 422,
        },
    )


@app.exception_handler(AcousticSpaceException)
async def acoustic_space_exception_handler(request: Request, exc: AcousticSpaceException) -> JSONResponse:
    """Handle AcousticSpace-specific exceptions with standardized responses."""
    logger.error(
        f"AcousticSpace exception: {exc.message}",
        extra={
            "path": request.url.path,
            "status_code": exc.status_code,
            "error_code": exc.error_code,
            "detail": exc.detail,
        }
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "detail": exc.detail,
            "error_code": exc.error_code,
        },
    )

# -----------------------------
# Health Check
# -----------------------------
@app.get("/", tags=["Health"], summary="Health check", description="Returns the health status of the AcousticSpace API")
async def health_check():
    """Enhanced health check endpoint with model status.
    
    This endpoint is optimized to return immediately without triggering
    any ML model loading or heavy imports.
    
    Returns
    -------
    dict
        Health status information including API version and model status.
    """
    
    # Lightweight health check - no ML imports
    return {
        "success": True,
        "message": "Backend is running successfully.",
        "data": {
            "status": "running",
            "project": "AcousticSpace",
            "version": settings.APP_VERSION,
            "model_loaded": False,
            "device": "none",
            "model": settings.MODEL_NAME,
            "lazy_loading": True,
        }
    }



# -----------------------------
# API Routers
# -----------------------------
app.include_router(
    upload_router,
    prefix="/api/upload",
    tags=["Upload"]
)

app.include_router(
    predict_router,
    prefix="/api/predict",
    tags=["Prediction"]
)

app.include_router(
    analysis_router,
    prefix="/api/analysis",
    tags=["Analysis"]
)

app.include_router(
    history_router,
    prefix="/api/history",
    tags=["History"]
)