"""Room impulse response (RIR) approximation and acoustic descriptor extraction.

This module provides heuristic acoustic descriptors using signal processing.
It does NOT require ML models.

Provided descriptors:
- Background noise estimation
- Reverberation time (RT60) approximation using energy decay curve
- Additional approximate descriptors useful for acoustic physics features

These features are structured as JSON-serializable dicts with stable keys.
"""

from __future__ import annotations

from typing import Any, Dict, Tuple

import numpy as np
import librosa

from app.core.logger import log_error, log_info


def estimate_background_noise(audio: np.ndarray, *, top_db: int = 40) -> float:
    """Estimate background noise RMS from low-energy regions."""

    y = np.asarray(audio, dtype=np.float32)
    if y.size == 0:
        return 0.0

    # Use librosa to find non-silent frames.
    intervals = librosa.effects.split(y, top_db=top_db)
    if intervals.size == 0:
        # Entire signal considered silent -> use global RMS.
        return float(np.sqrt(np.mean(y ** 2)))

    # Collect samples outside speech/sound intervals as background.
    mask = np.ones_like(y, dtype=bool)
    for start, end in intervals:
        mask[start:end] = False

    noise_samples = y[mask]
    if noise_samples.size == 0:
        # Fallback: use lower quantile RMS.
        return float(np.sqrt(np.mean(y ** 2)))

    return float(np.sqrt(np.mean(noise_samples ** 2)))


def _energy_decay_curve(audio: np.ndarray, frame_length: int, hop_length: int) -> Tuple[np.ndarray, np.ndarray]:
    """Compute normalized energy decay curve in dB."""

    y = np.asarray(audio, dtype=np.float32)
    rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)
    # Convert to energy in dB.
    e = rms.flatten() ** 2
    e_db = 10.0 * np.log10(np.maximum(e, 1e-12))
    # Normalize so max is 0 dB.
    e_db = e_db - np.max(e_db)
    t = np.arange(len(e_db)) * hop_length
    return t, e_db


def estimate_rt60(
    audio: np.ndarray,
    sample_rate: int,
    *,
    frame_ms: float = 50.0,
    hop_ms: float = 10.0,
    decay_db_start: float = -5.0,
    decay_db_end: float = -25.0,
) -> Dict[str, Any]:
    """Estimate RT60 from an energy decay curve.

    Heuristic approach:
    - Compute energy decay in dB
    - Fit a line in [decay_db_start, decay_db_end]
    - Extrapolate time for 60 dB decay

    Returns dict containing:
    - rt60_seconds (or None)
    - slope_db_per_sec
    - fit_r2 (simple correlation metric)
    """

    y = np.asarray(audio, dtype=np.float32)
    if y.size == 0:
        return {"rt60_seconds": None, "slope_db_per_sec": None, "fit_r2": None}

    frame_length = int(sample_rate * frame_ms / 1000.0)
    hop_length = int(sample_rate * hop_ms / 1000.0)
    frame_length = max(256, frame_length)
    hop_length = max(32, hop_length)

    try:
        t_frames, e_db = _energy_decay_curve(y, frame_length, hop_length)
        t_seconds = t_frames / float(sample_rate)

        # Select region for linear fit.
        mask = (e_db <= decay_db_start) & (e_db >= decay_db_end)
        if np.sum(mask) < 5:
            return {"rt60_seconds": None, "slope_db_per_sec": None, "fit_r2": None}

        x = t_seconds[mask]
        ydb = e_db[mask]

        # Linear regression: ydb = a*x + b
        a, b = np.polyfit(x, ydb, 1)

        # Correlation r^2
        y_hat = a * x + b
        ss_res = np.sum((ydb - y_hat) ** 2)
        ss_tot = np.sum((ydb - np.mean(ydb)) ** 2) + 1e-12
        r2 = 1.0 - (ss_res / ss_tot)

        # RT60 extrapolation: time for 60 dB decay from 0.
        # Since e_db is normalized to max at 0, decay_db = -60.
        # Solve -60 = a * t => t = (-60)/a
        slope_db_per_sec = float(a)
        if slope_db_per_sec == 0:
            rt60 = None
        else:
            rt60 = float((-60.0) / slope_db_per_sec)
            if rt60 < 0 or not np.isfinite(rt60):
                rt60 = None

        return {
            "rt60_seconds": rt60,
            "slope_db_per_sec": slope_db_per_sec,
            "fit_r2": float(r2),
            "fit_range_db": [decay_db_start, decay_db_end],
        }

    except Exception as exc:
        log_error(f"RT60 estimation failed: {exc}")
        return {"rt60_seconds": None, "slope_db_per_sec": None, "fit_r2": None}


def extract_rir_features(audio: np.ndarray, sample_rate: int) -> Dict[str, Any]:
    """Extract heuristic RIR/acoustic descriptor features."""

    try:
        y = np.asarray(audio, dtype=np.float32)
        if y.size == 0:
            raise ValueError("Empty audio.")

        noise_rms = estimate_background_noise(y)
        rt60 = estimate_rt60(y, sample_rate)

        # Additional descriptors:
        # - Peak-to-average ratio (rough impulsiveness proxy)
        peak = float(np.max(np.abs(y)))
        rms = float(np.sqrt(np.mean(y ** 2))) if np.mean(y ** 2) > 0 else 0.0
        p2a = float(peak / (rms + 1e-12))

        # - Spectral rolloff-based reverberation proxy (simple)
        n_fft = 2048 if y.shape[0] >= 2048 else 1024
        hop_length = 512
        rolloff = librosa.feature.spectral_rolloff(y=y, sr=sample_rate, n_fft=n_fft, hop_length=hop_length)
        rolloff_stats = {
            "mean_hz": float(np.mean(rolloff)),
            "std_hz": float(np.std(rolloff)),
            "min_hz": float(np.min(rolloff)),
            "max_hz": float(np.max(rolloff)),
        }

        result: Dict[str, Any] = {
            "background_noise_rms": noise_rms,
            "rt60": rt60,
            "impulsiveness_peak_to_avg": p2a,
            "spectral_rolloff": rolloff_stats,
        }

        log_info("RIR/acoustic descriptor extraction completed.")
        return result

    except Exception as exc:
        log_error(f"RIR feature extraction failed: {exc}")
        raise RuntimeError(f"RIR feature extraction failed: {exc}")

