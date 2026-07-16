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
from app.services.mock_prediction import predict
from app.services.preprocessing import preprocess_audio
from app.services.rir_extractor import extract_rir_features

router = APIRouter()


class PredictionRequestModel(BaseModel):
    file_path: str


@router.post("/", response_model=PredictionResponse)
async def predict(request: PredictionRequestModel, db=Depends(get_db)) -> PredictionResponse:
    """Predict whether an audio file is Real or Fake."""

    start = time.perf_counter()
    log_info(f"Prediction request received for: {request.file_path}")

    try:
        # Step 1: Load audio
        t0 = time.perf_counter()
        audio, sample_rate = load_audio(request.file_path)
        t_load = time.perf_counter() - t0
        log_info(f"Audio loaded in {t_load:.2f}s")

        # Step 2: Preprocess audio
        t0 = time.perf_counter()
        processed_audio = preprocess_audio(audio, sample_rate)
        t_preprocess = time.perf_counter() - t0
        log_info(f"Preprocessing completed in {t_preprocess:.2f}s")

        # Step 3: Extract features
        t0 = time.perf_counter()
        acoustic_features = extract_features(processed_audio, sample_rate)
        t_features = time.perf_counter() - t0
        log_info(f"Feature extraction completed in {t_features:.2f}s")

        # Step 4: Extract RIR features
        t0 = time.perf_counter()
        rir_features = extract_rir_features(processed_audio, sample_rate)
        t_rir = time.perf_counter() - t0
        log_info(f"RIR extraction completed in {t_rir:.2f}s")

        # Step 5: Breathing analysis
        t0 = time.perf_counter()
        breathing_features = analyze_breathing(processed_audio, sample_rate)
        t_breathing = time.perf_counter() - t0
        log_info(f"Breathing analysis completed in {t_breathing:.2f}s")

        # Step 6: Generate prediction (mock or real)
        t0 = time.perf_counter()
        processing_time_so_far = time.perf_counter() - start
        prediction_result = predict(
            acoustic_features=acoustic_features,
            rir_features=rir_features,
            breathing_features=breathing_features,
            processing_time=processing_time_so_far,
        )
        t_prediction = time.perf_counter() - t0
        log_info(f"Prediction generated in {t_prediction:.2f}s")

        # Calculate total processing time
        processing_time = round(time.perf_counter() - start, 4)
        duration = round(len(processed_audio) / sample_rate, 2)

        # Log timing breakdown
        log_info(
            f"Timing breakdown - Load: {t_load:.2f}s, Preprocess: {t_preprocess:.2f}s, "
            f"Features: {t_features:.2f}s, RIR: {t_rir:.2f}s, "
            f"Breathing: {t_breathing:.2f}s, Prediction: {t_prediction:.2f}s, "
            f"Total: {processing_time:.2f}s"
        )

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

        log_info(f"Prediction completed: {prediction_result.get('prediction')} "
                 f"(confidence={prediction_result.get('confidence')}%)")

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

