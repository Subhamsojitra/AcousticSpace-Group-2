"""Analysis API.

Endpoint:
- POST /api/analysis

Workflow implemented (handcrafted, ML-agnostic):
- load audio
- preprocess
- extract handcrafted acoustic features
- extract heuristic RIR/acoustic descriptors
- analyze breathing/pause statistics

This module persists analysis results to DB history.
"""

from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException

from app.api.schemas import AnalysisResponse
from app.core.logger import log_error, log_info
from app.database.db import get_db
from app.database.models import History
from app.services.audio_loader import get_audio_duration, load_audio
from app.services.breathing_analysis import analyze_breathing
from app.services.feature_extractor import extract_features
from app.services.preprocessing import preprocess_audio
from app.services.rir_extractor import extract_rir_features

router = APIRouter()


from pydantic import BaseModel


class AnalysisRequestModel(BaseModel):
    """Request model for /api/analysis."""

    file_path: str



@router.post("/", response_model=AnalysisResponse)
async def analyze_audio(
    request: AnalysisRequestModel,
    db=Depends(get_db),
) -> AnalysisResponse:
    """Analyze an uploaded audio file."""

    start = time.perf_counter()

    try:
        # Load audio
        audio, sample_rate = load_audio(request.file_path)

        # Preprocess
        processed_audio = preprocess_audio(audio, sample_rate)

        # Feature Extraction
        features = extract_features(processed_audio, sample_rate)

        # RIR Features
        rir_features = extract_rir_features(processed_audio, sample_rate)

        # Breathing Analysis
        breathing_features = analyze_breathing(processed_audio, sample_rate)

        processing_time = round(time.perf_counter() - start, 4)
        duration = get_audio_duration(processed_audio, sample_rate)

        # Persist to history (prediction fields remain null for /analysis)
        import pathlib

        record = History(
            filename=pathlib.Path(request.file_path).name,
            original_filename=pathlib.Path(request.file_path).name,

            file_path=request.file_path,
            duration=duration,
            sample_rate=sample_rate,
            prediction=None,
            confidence=None,
            processing_time=processing_time,
        )
        db.add(record)
        db.commit()

        log_info("Audio analysis completed.")

        return AnalysisResponse(
            message="Audio analysis completed successfully.",
            audio={"sample_rate": sample_rate, "duration": duration},
            features=features,
            rir_features=rir_features,
            breathing_analysis=breathing_features,
        )

    except HTTPException:
        raise
    except Exception as exc:
        log_error(f"Analysis failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")

