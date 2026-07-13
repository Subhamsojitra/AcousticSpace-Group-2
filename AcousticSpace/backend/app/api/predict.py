"""Prediction API.

Endpoint:
- POST /api/predict

Current behavior:
- ML-agnostic pipeline to generate handcrafted features.
- Uses `app.services.inference.predict_audio` for future integration.

This module persists prediction results to DB history.
"""

from __future__ import annotations

import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.schemas import PredictionResponse
from app.core.logger import log_error, log_info
from app.database.db import get_db
from app.database.models import History
from app.services.audio_loader import load_audio
from app.services.breathing_analysis import analyze_breathing
from app.services.feature_extractor import extract_features
from app.services.inference import predict_audio
from app.services.preprocessing import preprocess_audio
from app.services.rir_extractor import extract_rir_features

router = APIRouter()


class PredictionRequestModel(BaseModel):
    file_path: str


@router.post("/", response_model=PredictionResponse)
async def predict(request: PredictionRequestModel, db=Depends(get_db)) -> PredictionResponse:
    """Predict whether an audio file is Real or Fake."""

    start = time.perf_counter()

    try:
        audio, sample_rate = load_audio(request.file_path)
        processed_audio = preprocess_audio(audio, sample_rate)

        acoustic_features = extract_features(processed_audio, sample_rate)
        rir_features = extract_rir_features(processed_audio, sample_rate)
        breathing_features = analyze_breathing(processed_audio, sample_rate)

        prediction_result = predict_audio(
            acoustic_features=acoustic_features,
            rir_features=rir_features,
            breathing_features=breathing_features,
        )

        processing_time = round(time.perf_counter() - start, 4)
        duration = round(len(processed_audio) / sample_rate, 2)

        filename = __import__("pathlib").Path(request.file_path).name

        record = History(
            filename=filename,
            original_filename=filename,
            file_path=request.file_path,
            duration=duration,
            sample_rate=sample_rate,
            prediction=prediction_result.get("prediction"),
            confidence=prediction_result.get("confidence"),
            processing_time=processing_time,
        )
        db.add(record)
        db.commit()

        log_info("Prediction completed.")

        return PredictionResponse(
            message="Prediction completed successfully.",
            prediction=prediction_result["prediction"],
            confidence=float(prediction_result["confidence"]),
            analysis={"sample_rate": sample_rate, "duration": duration},
        )

    except HTTPException:
        raise
    except Exception as exc:
        log_error(f"Prediction failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")

