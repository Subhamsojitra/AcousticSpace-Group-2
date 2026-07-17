"""Mock Prediction Service

This service provides immediate mock predictions for frontend integration
when the ML model is not available. It returns a response format identical
to the future ML model response.

When the CNN/AST model is ready, replace the mock_prediction() call with
real_model.predict() without changing the frontend API.
"""

from __future__ import annotations

import random
import time
from typing import Dict

from app.core.logger import log_info, log_error


def mock_prediction(
    acoustic_features: Dict,
    rir_features: Dict,
    breathing_features: Dict,
    processing_time: float,
) -> Dict:
    """
    Generate a mock prediction for frontend integration testing.

    Parameters
    ----------
    acoustic_features : dict
        Extracted acoustic features (used for validation).
    rir_features : dict
        Extracted RIR features.
    breathing_features : dict
        Extracted breathing analysis features.
    processing_time : float
        Actual backend processing time in seconds.

    Returns
    -------
    dict
        Mock prediction result with the same format as the future ML model:
        {
            "prediction": "Real" or "Fake",
            "confidence": float (0-100),
            "rir_score": int (0-100),
            "breathing_score": int (0-100),
            "processing_time": str (formatted time),
            "status": "completed"
        }
    """

    try:
        # Validate inputs (lightweight check)
        if not acoustic_features or not rir_features or not breathing_features:
            raise ValueError("Missing required features for prediction.")

        # Simulate minimal processing time for mock inference
        # (real model will replace this)
        mock_inference_time = time.perf_counter()

        # Generate deterministic but varied mock results
        # Using random for variety, but can be made deterministic for testing
        prediction = random.choice(["Real", "Fake"])
        confidence = round(random.uniform(85.0, 99.0), 2)

        # Generate mock scores based on features (or random if features are minimal)
        rir_score = random.randint(50, 95)
        breathing_score = random.randint(30, 80)

        # Format processing time
        processing_time_str = f"{processing_time:.2f}s"

        result = {
            "prediction": prediction,
            "confidence": confidence,
            "rir_score": rir_score,
            "breathing_score": breathing_score,
            "processing_time": processing_time_str,
            "status": "completed",
        }

        log_info(
            f"Mock prediction generated: {prediction} "
            f"(confidence={confidence}%, rir={rir_score}, breathing={breathing_score})"
        )

        return result

    except Exception as e:
        log_error(f"Mock prediction failed: {str(e)}")
        raise RuntimeError(f"Mock prediction failed: {str(e)}")


def should_use_real_model() -> bool:
    """
    Check if the real ML model is ready for inference.

    Future implementation:
    - Check if model files exist
    - Check if model is loaded
    - Check GPU/CPU availability

    Returns
    -------
    bool
        True if real model should be used, False for mock prediction.
    """
    # TODO: Implement model readiness check
    # For now, always use mock prediction
    return False


def predict(
    acoustic_features: Dict,
    rir_features: Dict,
    breathing_features: Dict,
    processing_time: float,
) -> Dict:
    """
    Main prediction entry point.

    This function decides whether to use the real ML model or mock prediction.
    When the model is ready, only this function needs to be updated.

    Parameters
    ----------
    acoustic_features : dict
    rir_features : dict
    breathing_features : dict
    processing_time : float

    Returns
    -------
    dict
        Prediction result.
    """

    if should_use_real_model():
        # Future: Replace with real model inference
        # from app.services.inference import predict_audio
        # result = predict_audio(acoustic_features, rir_features, breathing_features)
        # result["processing_time"] = f"{processing_time:.2f}s"
        # result["status"] = "completed"
        # return result
        pass

    # Use mock prediction for integration testing
    return mock_prediction(
        acoustic_features,
        rir_features,
        breathing_features,
        processing_time,
    )