"""
Cadence Alignment Service

Responsible for:
- Detecting syllable peaks in speech
- Extracting breath event timestamps
- Computing alignment scores between breathing and speech rhythm
- Analyzing cadence regularity

This module provides a production-ready heuristic approach to estimate
whether breathing occurs naturally relative to speech rhythm.

Uses the new array-based overload (analyze_breathing_alignment_from_array)
to avoid deprecated librosa.output.write_wav and inefficient temp-file I/O.
"""

from __future__ import annotations

import time
from typing import Any, Dict

import numpy as np

from app.core.logger import log_error, log_info


def analyze_cadence_alignment(
    audio: np.ndarray,
    sample_rate: int,
    max_duration_sec: float = 30.0,
) -> Dict[str, Any]:
    """
    Analyze breathing cadence alignment from a pre-loaded audio array.

    Calls the array-based overload in the scripts module to avoid deprecated
    librosa.output.write_wav and inefficient temp-file round-trips.

    Parameters
    ----------
    audio : np.ndarray
        Audio signal (mono).
    sample_rate : int
        Sampling rate.
    max_duration_sec : float
        Maximum audio duration to process (seconds). Default 30s for performance.

    Returns
    -------
    Dict[str, Any]
        {
            "alignment_score": float (0-1),
            "cadence": str ("Natural", "Suspicious", "Insufficient Data"),
            "breath_count": int,
            "syllable_count": int,
            "regularity": float (0-1),
            "mean_offset": float (seconds)
        }
    """
    start_time = time.perf_counter()

    try:
        # Import here to avoid circular dependencies
        from AcousticSpace.scripts.cadence_alignment import (
            analyze_breathing_alignment_from_array,
        )

        # Limit to max_duration_sec for performance
        max_samples = int(max_duration_sec * sample_rate)
        if len(audio) > max_samples:
            audio = audio[:max_samples]
            log_info(f"Cadence alignment limited to first {max_duration_sec}s")

        result = analyze_breathing_alignment_from_array(
            audio,
            sr=sample_rate,
        )

        processing_time = time.perf_counter() - start_time

        log_info(
            f"Cadence alignment completed in {processing_time:.2f}s: "
            f"cadence={result.get('cadence')}, "
            f"score={result.get('alignment_score')}, "
            f"breaths={result.get('breath_count')}, "
            f"syllables={result.get('syllable_count')}"
        )

        return result

    except Exception as e:
        log_error(f"Cadence alignment analysis failed: {str(e)}")
        return {
            "alignment_score": 0.0,
            "cadence": "Error",
            "breath_count": 0,
            "syllable_count": 0,
            "regularity": 0.0,
            "mean_offset": 0.0,
        }
