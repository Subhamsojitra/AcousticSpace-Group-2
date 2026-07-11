"""Audio preprocessing service.

Responsible for:
- Audio loading is handled by `app.services.audio_loader.load_audio`.
- This module focuses on signal conditioning:
  - mono conversion
  - resampling
  - normalization
  - silence trimming

All functions are pure and return JSON-serializable outputs when
possible. The main entrypoint `preprocess_audio` returns a processed
1D numpy array.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

import numpy as np
import librosa

from app.core.logger import log_error, log_info


@dataclass(frozen=True)
class PreprocessConfig:
    """Preprocessing configuration."""

    target_sample_rate: int = 16000
    top_db: int = 25
    normalize: bool = True


def to_mono(audio: np.ndarray) -> np.ndarray:
    """Ensure audio is mono.

    Parameters
    ----------
    audio:
        A mono vector (shape: [n]) or stereo/multi-channel (shape: [c, n] or [n, c]).

    Returns
    -------
    np.ndarray
        Mono signal.
    """

    if audio.ndim == 1:
        return audio

    # librosa typically returns mono already, but keep this robust.
    if audio.shape[0] in (1, 2):
        return np.mean(audio, axis=0)

    return np.mean(audio, axis=-1)


def resample_audio(audio: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    """Resample audio to target sample rate."""

    if orig_sr == target_sr:
        return audio

    return librosa.resample(audio, orig_sr=orig_sr, target_sr=target_sr)


def normalize_audio(audio: np.ndarray) -> np.ndarray:
    """Peak normalize audio to [-1, 1] range."""

    if audio.size == 0:
        return audio

    # Avoid division by zero.
    peak = np.max(np.abs(audio))
    if peak <= 0:
        return audio

    return audio / peak


def trim_silence(audio: np.ndarray, top_db: int = 25) -> np.ndarray:
    """Trim leading/trailing silence using RMS-based threshold."""

    if audio.size == 0:
        return audio

    # librosa.effects.trim expects float32/float64.
    y = audio.astype(np.float32, copy=False)
    trimmed, _ = librosa.effects.trim(y, top_db=top_db)
    return trimmed


def preprocess_audio(
    audio: np.ndarray,
    sample_rate: int,
    *,
    config: PreprocessConfig | None = None,
) -> np.ndarray:
    """Preprocess audio for downstream feature extraction.

    Workflow:
    - mono conversion
    - resampling to target sample rate
    - optional normalization
    - silence trimming

    Parameters
    ----------
    audio:
        Raw audio samples.
    sample_rate:
        Source sample rate.
    config:
        Optional preprocessing config.

    Returns
    -------
    np.ndarray
        Processed mono audio.

    Raises
    ------
    RuntimeError
        If preprocessing fails.
    """

    cfg = config or PreprocessConfig(target_sample_rate=sample_rate)

    try:
        y = to_mono(audio)
        y = resample_audio(y, orig_sr=sample_rate, target_sr=cfg.target_sample_rate)

        if cfg.normalize:
            y = normalize_audio(y)

        # Trim silence after normalization.
        y = trim_silence(y, top_db=cfg.top_db)

        if y.size == 0:
            # Keep consistent with validation philosophy.
            raise ValueError("Audio became empty after trimming silence.")

        log_info("Preprocessing completed.")
        return y.astype(np.float32, copy=False)

    except Exception as exc:
        log_error(f"Preprocessing failed: {exc}")
        raise RuntimeError(f"Preprocessing failed: {exc}")

