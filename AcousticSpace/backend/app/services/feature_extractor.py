"""Handcrafted acoustic feature extraction service.

Extracts JSON-serializable handcrafted features using Librosa:
- Mel spectrogram summary statistics
- MFCC stats
- Chroma stats
- Spectral contrast stats
- Spectral centroid/bandwidth/roll-off stats
- Zero crossing rate
- RMS energy

This service is intentionally ML-agnostic and is designed to feed future
CNN/AST models.
"""

from __future__ import annotations

from typing import Any, Dict

from app.core.logger import log_error, log_info


def _stats(x) -> Dict[str, float]:
    """Compute robust summary statistics for an array."""
    import numpy as np

    x = np.asarray(x, dtype=np.float32)
    if x.size == 0:
        return {
            "mean": 0.0,
            "std": 0.0,
            "min": 0.0,
            "max": 0.0,
            "p25": 0.0,
            "p50": 0.0,
            "p75": 0.0,
        }

    return {
        "mean": float(np.mean(x)),
        "std": float(np.std(x)),
        "min": float(np.min(x)),
        "max": float(np.max(x)),
        "p25": float(np.percentile(x, 25)),
        "p50": float(np.percentile(x, 50)),
        "p75": float(np.percentile(x, 75)),
    }


def _safe_log1p(x, eps: float = 1e-10):
    import numpy as np
    return np.log1p(np.maximum(x, eps))


def extract_features(audio, sample_rate: int, max_duration_sec: float = 30.0) -> Dict[str, Any]:
    """Extract handcrafted acoustic features.

    Parameters
    ----------
    audio:
        Preprocessed mono audio.
    sample_rate:
        Sampling rate.
    max_duration_sec:
        Maximum audio duration to process (seconds). Default 30s for fast integration.

    Returns
    -------
    dict
        JSON-serializable feature dictionary with stable keys.
    """
    import numpy as np
    import librosa

    try:
        y = np.asarray(audio, dtype=np.float32)
        if y.size == 0:
            raise ValueError("Empty audio array.")

        # Limit to max_duration_sec for faster processing
        max_samples = int(max_duration_sec * sample_rate)
        if len(y) > max_samples:
            y = y[:max_samples]
            log_info(f"Feature extraction limited to first {max_duration_sec}s")

        # Common STFT parameters.
        n_fft = 2048 if y.shape[0] >= 2048 else 1024
        hop_length = 512

        # Mel spectrogram.
        mel_spec = librosa.feature.melspectrogram(
            y=y,
            sr=sample_rate,
            n_fft=n_fft,
            hop_length=hop_length,
            n_mels=128,
            power=2.0,
        )
        mel_db = librosa.power_to_db(mel_spec, ref=np.max)
        mel_features = {
            "mel_db": _stats(mel_db.flatten()),
        }

        # MFCC.
        mfcc = librosa.feature.mfcc(
            y=y,
            sr=sample_rate,
            n_mfcc=20,
            n_fft=n_fft,
            hop_length=hop_length,
        )
        mfcc_features = {
            f"mfcc_{i+1}": _stats(mfcc[i, :])
            for i in range(mfcc.shape[0])
        }

        # Chroma.
        chroma = librosa.feature.chroma_stft(
            y=y,
            sr=sample_rate,
            n_fft=n_fft,
            hop_length=hop_length,
        )
        chroma_features = {
            f"chroma_{i}": _stats(chroma[i, :])
            for i in range(chroma.shape[0])
        }

        # Spectral contrast.
        contrast = librosa.feature.spectral_contrast(
            y=y,
            sr=sample_rate,
            n_fft=n_fft,
            hop_length=hop_length,
        )
        contrast_features = {
            "spectral_contrast": _stats(contrast.flatten())
        }

        # Spectral centroid/bandwidth/roll-off.
        centroid = librosa.feature.spectral_centroid(
            y=y,
            sr=sample_rate,
            n_fft=n_fft,
            hop_length=hop_length,
        )
        bandwidth = librosa.feature.spectral_bandwidth(
            y=y,
            sr=sample_rate,
            n_fft=n_fft,
            hop_length=hop_length,
        )
        rolloff = librosa.feature.spectral_rolloff(
            y=y,
            sr=sample_rate,
            n_fft=n_fft,
            hop_length=hop_length,
            roll_percent=0.85,
        )

        spectral_features = {
            "spectral_centroid_hz": _stats(centroid.flatten()),
            "spectral_bandwidth_hz": _stats(bandwidth.flatten()),
            "spectral_rolloff_hz": _stats(rolloff.flatten()),
        }

        # ZCR.
        zcr = librosa.feature.zero_crossing_rate(y, hop_length=hop_length)
        zcr_features = {"zero_crossing_rate": _stats(zcr.flatten())}

        # RMS energy.
        rms = librosa.feature.rms(y=y, frame_length=n_fft, hop_length=hop_length)
        rms_features = {"rms_energy": _stats(rms.flatten())}

        features: Dict[str, Any] = {
            "mel_spectrogram": mel_features,
            "mfcc": mfcc_features,
            "chroma": chroma_features,
            "spectral_contrast": contrast_features,
            "spectral": spectral_features,
            "zcr": zcr_features,
            "rms": rms_features,
        }

        log_info(f"Feature extraction completed. Processed {len(y)/sample_rate:.2f}s of audio.")
        return features

    except Exception as exc:
        log_error(f"Feature extraction failed: {exc}")
        raise RuntimeError(f"Feature extraction failed: {exc}")

