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

from app.core.logger import log_error, log_info


DEFAULT_SAMPLE_RATE = 16000


def load_audio(
    file_path: str,
    sample_rate: int = DEFAULT_SAMPLE_RATE
):
    """
    Load an audio file.

    Parameters
    ----------
    file_path : str
        Path to audio file.

    sample_rate : int
        Target sample rate.

    Returns
    -------
    tuple
        (audio_signal, sample_rate)

    Raises
    ------
    FileNotFoundError
        If file does not exist.

    RuntimeError
        If audio cannot be loaded.
    """

    # Lazy import heavy dependencies
    import librosa
    import numpy as np

    try:

        audio_path = Path(file_path)

        if not audio_path.exists():
            raise FileNotFoundError(
                f"Audio file not found: {file_path}"
            )

        audio, sr = librosa.load(
            audio_path,
            sr=sample_rate,
            mono=True
        )

        log_info(
            f"Loaded audio: {audio_path.name}"
        )

        return audio, sr

    except Exception as e:

        log_error(
            f"Failed to load audio: {str(e)}"
        )

        raise RuntimeError(
            f"Unable to load audio file: {str(e)}"
        )


def get_audio_duration(
    audio,
    sample_rate: int
) -> float:
    """
    Calculate duration of audio.

    Returns
    -------
    float
        Duration in seconds.
    """

    return round(
        len(audio) / sample_rate,
        2
    )


def get_sample_rate(
    sample_rate: int
) -> int:
    """
    Return sample rate.
    """

    return sample_rate


def validate_audio(
    audio
) -> bool:
    """
    Validate loaded audio.

    Returns
    -------
    bool
    """

    if audio is None:
        return False

    if len(audio) == 0:
        return False

    return True


def audio_information(
    audio,
    sample_rate: int
):
    """
    Return audio metadata.

    Returns
    -------
    dict
    """

    return {

        "duration": get_audio_duration(
            audio,
            sample_rate
        ),

        "sample_rate": sample_rate,

        "samples": len(audio),

        "channels": 1
    }
