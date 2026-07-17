"""AcousticSpace API Schemas.

Centralizes request/response models for FastAPI routers.
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    """Response returned after a successful audio upload."""

    success: bool = True
    message: str

    file_name: str = Field(..., description="Generated unique filename")
    original_name: str = Field(..., description="Original filename provided by the client")
    file_path: str = Field(..., description="Server-side path to the uploaded audio file")

    content_type: Optional[str] = Field(None, description="MIME type reported by the client")
    size_bytes: int = Field(..., description="Uploaded size in bytes")


class AnalysisAudioInfo(BaseModel):
    """Audio metadata included in analysis/prediction responses."""

    sample_rate: int
    duration: float


class AnalysisResponse(BaseModel):
    """Response returned by /api/analysis."""

    success: bool = True
    message: str

    audio: AnalysisAudioInfo
    features: Dict[str, Any]
    rir_features: Dict[str, Any]
    breathing_analysis: Dict[str, Any]


class PredictionResponse(BaseModel):
    """Response returned by /api/predict."""

    success: bool = True
    message: str

    prediction: Literal["Real", "Fake"]
    confidence: float

    analysis: AnalysisAudioInfo


class HistoryItem(BaseModel):
    """A single stored history record."""

    id: int
    filename: str
    original_filename: str
    file_path: str

    duration: Optional[float] = None
    sample_rate: Optional[int] = None

    prediction: Optional[str] = None
    confidence: Optional[float] = None

    processing_time: Optional[float] = None
    created_at: Optional[str] = None


class HistoryListResponse(BaseModel):
    """Response returned by /api/history."""

    success: bool = True
    count: int
    history: List[HistoryItem]


class HistorySingleResponse(BaseModel):
    """Response returned by /api/history/{history_id}."""

    success: bool = True
    history: HistoryItem


class DeleteResponse(BaseModel):
    """Generic delete response."""

    success: bool = True
    message: str


class ErrorResponse(BaseModel):
    """Standardized error response."""

    success: bool = False
    detail: str

