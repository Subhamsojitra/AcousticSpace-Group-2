import os

from contextlib import asynccontextmanager

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

    logger.info("AcousticSpace backend starting...")

    # Ensure required runtime folders exist.
    # (Config paths are relative to repo root in this project.)
    import os
    from pathlib import Path

    for p in [settings.UPLOAD_DIR, settings.FEATURE_DIR, settings.MODEL_DIR, settings.LOG_DIR]:
        Path(p).mkdir(parents=True, exist_ok=True)

    # Initialize DB tables.
    Base.metadata.create_all(bind=engine)

    # Initialize app state for ML model integration
    app.state.cnn_model = None
    app.state.ast_model = None
    app.state.feature_extractor = None
    app.state.model_ready = False

    # Load AST model if available
    try:
        import torch
        from transformers import ASTForAudioClassification, ASTFeatureExtractor
        
        model_path = settings.AST_MODEL_PATH
        logger.info(f"Loading AST model from {model_path}...")
        
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        app.state.ast_model = ASTForAudioClassification.from_pretrained(model_path).to(device)
        app.state.ast_model.eval()
        app.state.feature_extractor = ASTFeatureExtractor.from_pretrained(model_path)
        app.state.model_ready = True
        
        logger.info(f"AST model loaded successfully on {device}")
    except Exception as e:
        logger.warning(f"Failed to load AST model: {e}. Using mock predictions.")
        app.state.ast_model = None
        app.state.feature_extractor = None
        app.state.model_ready = False

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
    return {
        "status": "running",
        "project": "AcousticSpace",
        "version": settings.APP_VERSION,
        "message": "Backend is running successfully.",
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