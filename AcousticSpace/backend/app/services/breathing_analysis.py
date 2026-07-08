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
    sample_rate: int
):
    """
    Analyze breathing-related characteristics.

    Parameters
    ----------
    audio : np.ndarray
        Audio signal.

    sample_rate : int
        Sampling rate.

    Returns
    -------
    dict
        Breathing statistics.
    """

    try:

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

        log_info("Breathing analysis completed.")

        return result

    except Exception as e:

        log_error(
            f"Breathing analysis failed: {str(e)}"
        )

        raise RuntimeError(
            f"Breathing analysis failed: {str(e)}"
        )