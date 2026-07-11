"""
Audio Loader Service

Responsible for:
- Loading audio files
- Converting stereo to mono
- Resampling audio
- Returning NumPy arrays

This service is used by:
- preprocessing.py
- feature_extractor.py
- rir_extractor.py
- breathing_analysis.py
- inference.py
"""

from pathlib import Path

import librosa
import numpy as np

from app.core.logger import log_error, log_info


DEFAULT_SAMPLE_RATE = 16000


def load_audio(
    file_path: str,
    sample_rate: int = DEFAULT_SAMPLE_RATE,
):
    """
    Load an audio file.

    Parameters
    ----------
    file_path : str
        Path to the audio file.

    sample_rate : int
        Target sample rate.

    Returns
    -------
    tuple
        (audio_signal, sample_rate)

    Raises
    ------
    FileNotFoundError
        If the audio file does not exist.

    RuntimeError
        If the audio cannot be loaded.
    """

    audio_path = Path(file_path)

    if not audio_path.is_file():
        raise FileNotFoundError(
            f"Audio file not found: {audio_path}"
        )

    try:
        audio, sr = librosa.load(
            path=audio_path,
            sr=sample_rate,
            mono=True,
        )

        if not validate_audio(audio):
            raise ValueError("Loaded audio is empty.")

        duration = get_audio_duration(audio, sr)

        log_info(
            f"Loaded audio '{audio_path.name}' "
            f"({duration:.2f} sec)"
        )

        return audio, sr

    except Exception as e:
        log_error(
            f"Failed to load '{audio_path}': {e}"
        )

        raise RuntimeError(
            f"Unable to load audio file: {audio_path}"
        ) from e


def get_audio_duration(
    audio: np.ndarray,
    sample_rate: int,
) -> float:
    """
    Calculate the duration of an audio signal.

    Returns
    -------
    float
        Duration in seconds.
    """

    return round(audio.size / sample_rate, 2)


def get_sample_rate(
    sample_rate: int,
) -> int:
    """
    Return the sample rate.
    """

    return sample_rate


def validate_audio(
    audio: np.ndarray,
) -> bool:
    """
    Validate the loaded audio signal.

    Returns
    -------
    bool
        True if valid, otherwise False.
    """

    return (
        audio is not None
        and audio.size > 0
    )


def audio_information(
    audio: np.ndarray,
    sample_rate: int,
):
    """
    Return metadata about the audio.

    Returns
    -------
    dict
    """

    return {
        "duration": get_audio_duration(
            audio,
            sample_rate,
        ),
        "sample_rate": sample_rate,
        "samples": audio.size,
        "channels": 1,
    }