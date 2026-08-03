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
    log_info(f"Analysis request received for: {request.file_path}")

    try:
        # Step 0: Lazy-load AST model on first analysis request
        log_info("Checking if AST model needs to be loaded...")
        try:
            # Lazy import to defer torch/transformers until first analysis
            from app.ml.model_loader import get_model_loader, ModelLoadError
            
            model_loader = get_model_loader()
            if not model_loader.is_loaded():
                log_info("AST model not loaded. Loading now...")
                success, message = model_loader.load_model()
                if success:
                    log_info(f"✓ AST model loaded successfully: {message}")
                else:
                    log_warning(f"AST model loading returned false: {message}")
            else:
                log_info("✓ AST model already loaded")
        except ModelLoadError as e:
            log_warning(f"Failed to load AST model: {e}. Analysis will continue without ML model.")
        except Exception as e:
            log_warning(f"Unexpected error loading AST model: {e}. Analysis will continue without ML model.")
        
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
        features = extract_features(processed_audio, sample_rate)
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

        # Step 6: Breathing cadence alignment analysis
        t0 = time.perf_counter()
        from app.services.cadence_alignment import analyze_cadence_alignment
        cadence_features = analyze_cadence_alignment(processed_audio, sample_rate)
        t_cadence = time.perf_counter() - t0
        log_info(f"Cadence alignment completed in {t_cadence:.2f}s")

        processing_time = round(time.perf_counter() - start, 4)
        duration = get_audio_duration(processed_audio, sample_rate)

        # Log timing breakdown
        log_info(
            f"Timing breakdown - Load: {t_load:.2f}s, Preprocess: {t_preprocess:.2f}s, "
            f"Features: {t_features:.2f}s, RIR: {t_rir:.2f}s, "
            f"Breathing: {t_breathing:.2f}s, Cadence: {t_cadence:.2f}s, "
            f"Total: {processing_time:.2f}s"
        )

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

        log_info(f"Audio analysis completed in {processing_time:.2f}s")

        return AnalysisResponse(
            message="Audio analysis completed successfully.",
            audio={"sample_rate": sample_rate, "duration": duration},
            features=features,
            rir_features=rir_features,
            breathing_analysis=breathing_features,
            breathing_alignment=cadence_features,
        )

    except HTTPException:
        raise
    except Exception as exc:
        log_error(f"Analysis failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")

