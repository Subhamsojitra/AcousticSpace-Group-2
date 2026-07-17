"""
Breathing Analysis Service

Responsible for:
- Detecting silent pauses
- Estimating breathing intervals
- Calculating pause statistics
- Returning breathing-related features

This module extracts handcrafted features.
It does NOT perform machine learning.
"""

import librosa
import numpy as np

from app.core.logger import log_error, log_info


def analyze_breathing(
    audio: np.ndarray,
    sample_rate: int,
    max_duration_sec: float = 30.0
):
    """
    Analyze breathing-related characteristics.

    Parameters
    ----------
    audio : np.ndarray
        Audio signal.
    sample_rate : int
        Sampling rate.
    max_duration_sec : float
        Maximum audio duration to process (seconds). Default 30s for fast integration.

    Returns
    -------
    dict
        Breathing statistics.
    """

    try:
        # Limit to max_duration_sec for faster processing
        max_samples = int(max_duration_sec * sample_rate)
        if len(audio) > max_samples:
            audio = audio[:max_samples]
            log_info(f"Breathing analysis limited to first {max_duration_sec}s")

        # Detect silent intervals
        intervals = librosa.effects.split(
            audio,
            top_db=25
        )

        pause_count = max(0, len(intervals) - 1)

        pause_durations = []

        for i in range(len(intervals) - 1):

            pause = (
                intervals[i + 1][0]
                - intervals[i][1]
            ) / sample_rate

            pause_durations.append(pause)

        if pause_durations:

            average_pause = float(
                np.mean(pause_durations)
            )

            longest_pause = float(
                np.max(pause_durations)
            )

        else:

            average_pause = 0.0
            longest_pause = 0.0

        duration = len(audio) / sample_rate

        if duration > 0:
            breathing_rate = round(
                pause_count * 60 / duration,
                2
            )
        else:
            breathing_rate = 0.0

        result = {

            "pause_count": pause_count,

            "average_pause_duration": round(
                average_pause,
                3
            ),

            "longest_pause_duration": round(
                longest_pause,
                3
            ),

            "breathing_rate": breathing_rate
        }

        log_info(f"Breathing analysis completed. Processed {len(audio)/sample_rate:.2f}s of audio.")

        return result

    except Exception as e:

        log_error(
            f"Breathing analysis failed: {str(e)}"
        )

        raise RuntimeError(
            f"Breathing analysis failed: {str(e)}"
        )