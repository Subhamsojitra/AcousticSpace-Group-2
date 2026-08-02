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

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.api.schemas import PredictionResponse
from app.core.config import settings
from app.core.logger import log_error, log_info, log_warning
from app.database.db import get_db
from app.database.models import History
from app.services.audio_loader import load_audio
from app.services.audio_validation import validate_audio_file, AudioValidationError
from app.services.breathing_analysis import analyze_breathing
from app.services.cadence_alignment import analyze_cadence_alignment
from app.services.feature_extractor import extract_features
from app.services.inference import predict_audio
from app.services.mock_prediction import predict as mock_predict
from app.services.preprocessing import preprocess_audio
from app.services.rir_extractor import extract_rir_features

router = APIRouter()


# ----------------------------------------------------
# Lazy Model Loading (Production-Ready Singleton)
# ----------------------------------------------------
from app.ml.model_loader import get_model_loader, ModelLoadError

async def ensure_model_loaded():
    """
    Lazy-load AST model on first prediction request.
    Uses production-ready singleton pattern - model loads once and is cached.
    
    Returns
    -------
    bool
        True if model is ready, False if using mock predictions.
    """
    try:
        # Get the singleton model loader
        model_loader = get_model_loader()
        
        # Check if model is already loaded
        if model_loader.is_loaded():
            return True
        
        # Load model (singleton ensures this happens only once)
        success, message = model_loader.load_model()
        
        if success:
            log_info(f"✓ Model ready: {message}")
            return True
        else:
            log_warning(f"Model loading returned false: {message}")
            return False
            
    except ModelLoadError as e:
        log_warning(f"Failed to load AST model: {e}. Using mock predictions.")
        return False
    except Exception as e:
        log_warning(f"Unexpected error loading model: {e}. Using mock predictions.")
        return False


class PredictionRequestModel(BaseModel):
    file_path: str


@router.post("/", response_model=PredictionResponse)
async def predict(request: PredictionRequestModel, req: Request, db=Depends(get_db)) -> PredictionResponse:
    """Predict whether an audio file is Real or Fake."""

    start = time.perf_counter()
    log_info(f"Prediction request received for: {request.file_path}")

    try:
        # Step 0: Validate audio file
        t0 = time.perf_counter()
        is_valid, validation_info = validate_audio_file(request.file_path)
        t_validation = time.perf_counter() - t0
        
        if not is_valid:
            error_msg = validation_info.get("error", "Audio validation failed")
            log_warning(f"Audio validation failed: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Invalid audio file: {error_msg}")
        
        log_info(f"Audio validation passed in {t_validation:.2f}s")
        
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

        # Step 5b: Cadence alignment analysis
        t0 = time.perf_counter()
        cadence_features = analyze_cadence_alignment(processed_audio, sample_rate)
        t_cadence = time.perf_counter() - t0
        log_info(f"Cadence alignment analysis completed in {t_cadence:.2f}s")

        # Step 6: Lazy-load model if needed and generate prediction
        t0 = time.perf_counter()
        processing_time_so_far = time.perf_counter() - start
        
        # Lazy-load model on first request
        model_ready = await ensure_model_loaded()
        
        # Check if real model is available
        if model_ready:
            # Use production-ready model loader
            from app.ml.model_loader import get_model_loader
            model_loader = get_model_loader()
            ast_model = model_loader.get_model()
            feature_extractor = model_loader.get_feature_extractor()
            device = model_loader.get_device()
            
            if ast_model is not None and feature_extractor is not None:
                # Use real AST model inference
                import librosa
                import torch
                import numpy as np
                
                # Load audio for AST model (AST expects raw audio, not features)
                audio_for_ast, _ = librosa.load(request.file_path, sr=16000, mono=True)
                
                # Prepare inputs for AST
                inputs = feature_extractor(
                    audio_for_ast, 
                    sampling_rate=16000, 
                    return_tensors="pt"
                )
                input_values = inputs["input_values"].to(device)
                
                # Run inference (no gradients for inference)
                with torch.no_grad():
                    outputs = ast_model(input_values)
                    probs = torch.softmax(outputs.logits, dim=1)[0]
                    confidence_score = probs[1].item()  # probability of class 1 = fake
                    prediction = "Fake" if confidence_score > 0.5 else "Real"
                    confidence = round(confidence_score * 100, 2)
                
                prediction_result = {
                    "prediction": prediction,
                    "confidence": confidence,
                    "rir_score": None,
                    "breathing_score": None,
                    "alignment_score": cadence_features.get("alignment_score"),
                    "cadence": cadence_features.get("cadence"),
                    "processing_time": f"{processing_time_so_far:.2f}s",
                    "status": "completed",
                }
            else:
                # Model loader returned True but model is None - use mock
                log_warning("Model loader returned True but model is None. Using mock predictions.")
                prediction_result = mock_predict(
                    acoustic_features=acoustic_features,
                    rir_features=rir_features,
                    breathing_features=breathing_features,
                    cadence_features=cadence_features,
                    processing_time=processing_time_so_far,
                )
        else:
            # Use mock prediction
            prediction_result = mock_predict(
                acoustic_features=acoustic_features,
                rir_features=rir_features,
                breathing_features=breathing_features,
                cadence_features=cadence_features,
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
            f"Breathing: {t_breathing:.2f}s, Cadence: {t_cadence:.2f}s, "
            f"Prediction: {t_prediction:.2f}s, Total: {processing_time:.2f}s"
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

        # Log detailed prediction results including cadence metrics
        alignment_score = prediction_result.get("alignment_score", "N/A")
        cadence_label = prediction_result.get("cadence", "N/A")
        log_info(
            f"Prediction completed: {prediction_result.get('prediction')} "
            f"(confidence={prediction_result.get('confidence')}%, "
            f"alignment_score={alignment_score}, "
            f"cadence={cadence_label})"
        )

        return PredictionResponse(
            message="Prediction completed successfully.",
            prediction=prediction_result["prediction"],
            confidence=float(prediction_result["confidence"]),
            analysis={
                "sample_rate": sample_rate, 
                "duration": duration,
                "rir_score": prediction_result.get("rir_score"),
                "breathing_score": prediction_result.get("breathing_score"),
                "alignment_score": prediction_result.get("alignment_score"),
                "cadence": prediction_result.get("cadence"),
            },
        )

    except HTTPException:
        raise
    except Exception as exc:
        log_error(f"Prediction failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")

