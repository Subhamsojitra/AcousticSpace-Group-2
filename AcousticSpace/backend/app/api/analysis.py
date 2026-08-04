"""Analysis API.

Endpoint:
- POST /api/analysis

Workflow implemented (handcrafted, ML-agnostic):
- load audio
- preprocess
- extract handcrafted acoustic features
- extract heuristic RIR/acoustic descriptors
- analyze breathing/pause statistics
- analyze cadence alignment

This module persists analysis results to DB history.
"""

from __future__ import annotations

import time
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.api.schemas import AnalysisResponse
from app.core.exceptions import AudioValidationError, FileNotFoundError, ProcessingError
from app.core.logger import log_analysis_finished, log_analysis_started, log_error, log_info, log_warning
from app.core.validation import InputValidator, validate_analysis_request
from app.database.db import get_db
from app.database.models import History
from app.services.audio_loader import get_audio_duration, load_audio
from app.services.breathing_analysis import analyze_breathing
from app.services.cadence_alignment import analyze_cadence_alignment
from app.services.feature_extractor import extract_features
from app.services.preprocessing import preprocess_audio
from app.services.rir_extractor import extract_rir_features

router = APIRouter()


class AnalysisRequestModel(BaseModel):
    """Request model for /api/analysis."""
    
    file_path: str = Field(
        ...,
        description="Absolute or relative path to the audio file to analyze",
        min_length=1,
        max_length=500,
        examples=["/path/to/audio.wav"]
    )


@router.post(
    "/",
    response_model=AnalysisResponse,
    summary="Analyze audio file",
    description="Perform comprehensive audio analysis including feature extraction, RIR analysis, breathing analysis, and cadence alignment.",
    responses={
        400: {"description": "Invalid audio file or validation failed"},
        404: {"description": "Audio file not found"},
        500: {"description": "Analysis processing failed"},
    }
)
async def analyze_audio(
    request: AnalysisRequestModel,
    req: Request,
    db=Depends(get_db),
) -> AnalysisResponse:
    """Analyze an uploaded audio file.
    
    Parameters
    ----------
    request : AnalysisRequestModel
        The analysis request containing the file path.
    req : Request
        The FastAPI request object.
    db : Session
        Database session dependency.
        
    Returns
    -------
    AnalysisResponse
        Comprehensive analysis results including features and metadata.
        
    Raises
    ------
    FileNotFoundError
        If the audio file does not exist.
    ProcessingError
        If audio processing fails at any stage.
    """

    start = time.perf_counter()
    request_id = req.headers.get("x-request-id", "")
    log_analysis_started(request.file_path, request_id)

    try:
        # Step 0: Validate file path using centralized validation
        is_valid, error_msg = validate_analysis_request(request.file_path)
        if not is_valid:
            if "does not exist" in error_msg:
                raise FileNotFoundError(
                    message="Audio file not found.",
                    detail=error_msg
                )
            else:
                raise AudioValidationError(
                    message="Invalid request.",
                    detail=error_msg
                )
        
        file_path = Path(request.file_path)

        # Step 1: Lazy-load AST model on first analysis request (non-blocking)
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
        
        # Step 2: Load audio
        t0 = time.perf_counter()
        try:
            audio, sample_rate = load_audio(request.file_path)
        except Exception as exc:
            raise ProcessingError(
                message="Failed to load audio file.",
                detail=f"Error loading audio: {str(exc)}"
            )
        t_load = time.perf_counter() - t0
        log_info(f"Audio loaded in {t_load:.2f}s")

        # Step 3: Preprocess audio
        t0 = time.perf_counter()
        try:
            processed_audio = preprocess_audio(audio, sample_rate)
        except Exception as exc:
            raise ProcessingError(
                message="Audio preprocessing failed.",
                detail=f"Error during preprocessing: {str(exc)}"
            )
        t_preprocess = time.perf_counter() - t0
        log_info(f"Preprocessing completed in {t_preprocess:.2f}s")

        # Step 4: Extract features
        t0 = time.perf_counter()
        try:
            features = extract_features(processed_audio, sample_rate)
        except Exception as exc:
            raise ProcessingError(
                message="Feature extraction failed.",
                detail=f"Error extracting features: {str(exc)}"
            )
        t_features = time.perf_counter() - t0
        log_info(f"Feature extraction completed in {t_features:.2f}s")

        # Step 5: Extract RIR features
        t0 = time.perf_counter()
        try:
            rir_features = extract_rir_features(processed_audio, sample_rate)
        except Exception as exc:
            raise ProcessingError(
                message="RIR feature extraction failed.",
                detail=f"Error extracting RIR features: {str(exc)}"
            )
        t_rir = time.perf_counter() - t0
        log_info(f"RIR extraction completed in {t_rir:.2f}s")

        # Step 6: Breathing analysis
        t0 = time.perf_counter()
        try:
            breathing_features = analyze_breathing(processed_audio, sample_rate)
        except Exception as exc:
            raise ProcessingError(
                message="Breathing analysis failed.",
                detail=f"Error during breathing analysis: {str(exc)}"
            )
        t_breathing = time.perf_counter() - t0
        log_info(f"Breathing analysis completed in {t_breathing:.2f}s")

        # Step 7: Cadence alignment analysis
        t0 = time.perf_counter()
        try:
            cadence_features = analyze_cadence_alignment(processed_audio, sample_rate)
        except Exception as exc:
            raise ProcessingError(
                message="Cadence alignment analysis failed.",
                detail=f"Error during cadence analysis: {str(exc)}"
            )
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
        record = History(
            filename=Path(request.file_path).name,
            original_filename=Path(request.file_path).name,

            file_path=request.file_path,
            duration=duration,
            sample_rate=sample_rate,
            prediction=None,
            confidence=None,
            processing_time=processing_time,
        )
        db.add(record)
        db.commit()

        log_analysis_finished(processing_time)
        log_info(f"Audio analysis completed in {processing_time:.2f}s")

        return AnalysisResponse(
            message="Audio analysis completed successfully.",
            data={
                "processing_time_seconds": processing_time,
                "timing": {
                    "load": round(t_load, 4),
                    "preprocess": round(t_preprocess, 4),
                    "features": round(t_features, 4),
                    "rir": round(t_rir, 4),
                    "breathing": round(t_breathing, 4),
                    "cadence": round(t_cadence, 4),
                }
            },
            audio={"sample_rate": sample_rate, "duration": duration},
            features=features,
            rir_features=rir_features,
            breathing_analysis=breathing_features,
            breathing_alignment=cadence_features,
        )

    except (FileNotFoundError, AudioValidationError, ProcessingError):
        raise
    except HTTPException:
        raise
    except Exception as exc:
        log_error(f"Analysis failed: {exc}", exc_info=True)
        raise ProcessingError(
            message="Analysis failed.",
            detail=f"An unexpected error occurred during analysis: {str(exc)}"
        )

