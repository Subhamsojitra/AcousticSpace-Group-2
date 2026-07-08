from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import API routers
from app.api.upload import router as upload_router
from app.api.predict import router as predict_router
from app.api.analysis import router as analysis_router
from app.api.history import router as history_router


# -----------------------------
# Application Lifecycle
# -----------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events.
    """

    print("🚀 AcousticSpace Backend Started")

    # Future:
    # Load ML model here
    # Create database tables
    # Check required folders

    yield

    print("🛑 AcousticSpace Backend Stopped")


# -----------------------------
# FastAPI App
# -----------------------------
app = FastAPI(
    title="AcousticSpace API",
    description="Backend API for Deepfake Audio Detection using Room Impulse Response (RIR)",
    version="1.0.0",
    lifespan=lifespan,
)


# -----------------------------
# CORS Configuration
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # React (Vite)
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Health Check
# -----------------------------
@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "running",
        "project": "AcousticSpace",
        "version": "1.0.0",
        "message": "Backend is running successfully."
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