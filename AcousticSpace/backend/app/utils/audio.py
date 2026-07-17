"""
Audio Utility Functions

This module contains reusable helper functions
for audio processing.

These utilities are shared across:
- audio_loader.py
- preprocessing.py
- feature_extractor.py
- rir_extractor.py
- breathing_analysis.py
- inference.py
"""

from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

from app.core.logger import log_error, log_info


DEFAULT_SAMPLE_RATE = 16000


# --------------------------------------------------------
# Load Audio
# --------------------------------------------------------
def read_audio(
    file_path: str,
    sample_rate: int = DEFAULT_SAMPLE_RATE
):
    """
    Read an audio file.

    Returns
    -------
    tuple
        (audio, sample_rate)
    """

    try:

        audio, sr = librosa.load(
            file_path,
            sr=sample_rate,
            mono=True
        )

        return audio, sr

    except Exception as e:

        log_error(f"Unable to read audio: {e}")

        raise


# --------------------------------------------------------
# Save Audio
# --------------------------------------------------------
def save_audio(
    file_path: str,
    audio: np.ndarray,
    sample_rate: int
):
    """
    Save processed audio.
    """

    try:

        Path(file_path).parent.mkdir(
            parents=True,
            exist_ok=True
        )

        sf.write(
            file_path,
            audio,
            sample_rate
        )

        log_info(f"Audio saved: {file_path}")

    except Exception as e:

        log_error(f"Unable to save audio: {e}")

        raise


# --------------------------------------------------------
# Audio Duration
# --------------------------------------------------------
def get_duration(
    audio: np.ndarray,
    sample_rate: int
) -> float:
    """
    Calculate duration.
    """

    return round(
        len(audio) / sample_rate,
        2
    )


# --------------------------------------------------------
# Normalize Audio
# --------------------------------------------------------
def normalize_audio(
    audio: np.ndarray
):
    """
    Normalize audio amplitude.
    """

    return librosa.util.normalize(audio)


# --------------------------------------------------------
# Trim Silence
# --------------------------------------------------------
def trim_silence(
    audio: np.ndarray,
    top_db: int = 25
):
    """
    Remove leading and trailing silence.
    """

    trimmed_audio, _ = librosa.effects.trim(
        audio,
        top_db=top_db
    )

    return trimmed_audio


# --------------------------------------------------------
# Convert Mono
# --------------------------------------------------------
def to_mono(
    audio: np.ndarray
):
    """
    Convert stereo audio to mono.
    """

    if audio.ndim == 1:
        return audio

    return np.mean(
        audio,
        axis=0
    )


# --------------------------------------------------------
# Validate Audio
# --------------------------------------------------------
def validate_audio(
    audio: np.ndarray
):
    """
    Validate audio signal.
    """

    if audio is None:
        return False

    if len(audio) == 0:
        return False

    return True


# --------------------------------------------------------
# Audio Information
# --------------------------------------------------------
def get_audio_info(
    audio: np.ndarray,
    sample_rate: int
):
    """
    Return metadata about audio.
    """

    return {

        "duration": get_duration(
            audio,
            sample_rate
        ),

        "sample_rate": sample_rate,

        "samples": len(audio),

        "channels": 1
    }