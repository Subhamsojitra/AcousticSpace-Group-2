import os

from contextlib import asynccontextmanager
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.upload import router as upload_router
from app.api.predict import router as predict_router
from app.api.analysis import router as analysis_router
from app.api.history import router as history_router

from app.core.config import settings
from app.core.logger import logger
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
    # NOTE: Model loading is now LAZY - happens on first prediction request
    app.state.cnn_model = None
    app.state.ast_model = None
    app.state.feature_extractor = None
    app.state.model_ready = False
    app.state.model_loading = False
    logger.info("✓ App state initialized (model will load on first prediction)")

    total_startup = time.perf_counter() - startup_start
    logger.info("=" * 60)
    logger.info(f"✓ Startup completed in {total_startup:.3f}s")
    logger.info(f"  (AST model will load on first prediction request)")
    logger.info("=" * 60)

    yield

    logger.info("AcousticSpace backend stopped.")


# -----------------------------
# FastAPI App
# -----------------------------
app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for Deepfake Audio Detection using Room Impulse Response (RIR)",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# -----------------------------
# CORS Configuration
# -----------------------------
# NOTE: keep origins configurable for production deployments.
allow_origins = [o.strip() for o in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]

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
# Health Check
# -----------------------------
@app.get("/", tags=["Health"])
async def health_check():
    """Enhanced health check endpoint with model status."""
    
    # Get model information if available
    model_info = {
        "model_loaded": False,
        "device": "none",
        "model": "none",
        "lazy_loading": True,
    }
    
    try:
        from app.ml.model_loader import get_model_loader
        model_loader = get_model_loader()
        model_info = {
            "model_loaded": model_loader.is_loaded(),
            "device": str(model_loader.get_device()) if model_loader.get_device() else "none",
            "model": settings.MODEL_NAME,
            "lazy_loading": True,
            "load_time_seconds": model_loader.get_load_time(),
        }
    except Exception as e:
        # Model loader not initialized yet or failed
        model_info["error"] = str(e)
    
    return {
        "status": "running",
        "project": "AcousticSpace",
        "version": settings.APP_VERSION,
        "message": "Backend is running successfully.",
        **model_info
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