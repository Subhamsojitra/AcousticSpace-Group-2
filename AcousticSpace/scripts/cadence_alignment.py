"""
cadence_alignment.py

Implements breathing cadence alignment analysis to estimate whether breathing
occurs naturally relative to speech rhythm.

Pipeline:
    1. Voice Activity Detection (via existing breathing_detector)
    2. Syllable peak detection using librosa onset detection
    3. Alignment scoring between breath events and syllable timestamps
    4. Cadence regularity analysis

This module uses only heuristic/librosa-based approaches - no neural networks.
Designed to be computationally lightweight and production-ready.

Dependencies: librosa, numpy, scipy
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional, Tuple

import librosa
import numpy as np
from scipy.signal import find_peaks

from AcousticSpace.scripts.breathing_detector import (
    classify_frames,
    extract_breath_events,
)

logger = logging.getLogger(__name__)

# ----------------------------------------------------
# Constants
# ----------------------------------------------------

SR = 16000
FRAME_LENGTH = 400   # 25ms at 16kHz
HOP_LENGTH = 160     # 10ms at 16kHz

# Syllable detection parameters
ONSET_AGGREGATE_FUNCTION = np.mean
ONSET_PEAK_PROMINENCE = 0.05
ONSET_PEAK_DISTANCE = 3  # Minimum frames between peaks (~30ms)

# Alignment scoring parameters
REWARD_WINDOW = 0.15  # Seconds: breath within this window after syllable gets reward
PENALTY_WINDOW = 0.10  # Seconds: breath overlapping speech gets penalty
MAX_OFFSET = 0.5  # Seconds: maximum offset to consider for alignment

# Cadence regularity parameters
MIN_BREATHS_FOR_REGULARITY = 2
REGULARITY_WINDOW = 3  # Number of consecutive intervals to check


# ----------------------------------------------------
# Syllable Detection
# ----------------------------------------------------


def detect_syllable_peaks(
    audio: np.ndarray,
    sr: int = SR,
    hop_length: int = HOP_LENGTH,
    frame_length: int = FRAME_LENGTH,
) -> List[float]:
    """
    Detect approximate syllable timestamps using onset strength and spectral flux.

    Uses a multi-feature onset detection approach:
    1. Onset strength envelope (spectral flux)
    2. Energy envelope
    3. Combined onset function
    4. Peak detection on combined onset

    Parameters
    ----------
    audio : np.ndarray
        Audio signal (mono).
    sr : int
        Sampling rate. Default 16000.
    hop_length : int
        Hop length for feature extraction. Default 160 (10ms).
    frame_length : int
        Frame length for feature extraction. Default 400 (25ms).

    Returns
    -------
    List[float]
        List of syllable timestamps in seconds.
        Example: [0.52, 1.08, 1.47, ...]

    Notes
    -----
    This is an approximation - not all onsets are syllables, and not all
    syllables produce detectable onsets. However, the relative density and
    timing of these peaks correlates well with speech rhythm.
    """
    try:
        if len(audio) < sr * 0.1:  # Less than 100ms
            logger.warning("Audio too short for syllable detection")
            return []

        # 1. Onset strength (spectral flux)
        onset_env = librosa.onset.onset_strength(
            y=audio,
            sr=sr,
            hop_length=hop_length,
            aggregate=ONSET_AGGREGATE_FUNCTION,
        )

        # 2. Energy envelope (RMS)
        rms = librosa.feature.rms(
            y=audio,
            frame_length=frame_length,
            hop_length=hop_length,
        )[0]

        # 3. Normalize and combine onset + energy
        # Weight onset strength more heavily (0.7) than energy (0.3)
        onset_norm = librosa.util.normalize(onset_env)
        energy_norm = librosa.util.normalize(rms)

        # Ensure same length
        min_len = min(len(onset_norm), len(energy_norm))
        combined = 0.7 * onset_norm[:min_len] + 0.3 * energy_norm[:min_len]

        # 4. Smooth the combined onset function
        combined_smooth = librosa.util.normalize(
            np.convolve(combined, np.ones(3) / 3, mode="same")
        )

        # 5. Peak detection
        # Find peaks that are prominent enough and well-separated
        peaks, properties = find_peaks(
            combined_smooth,
            prominence=ONSET_PEAK_PROMINENCE,
            distance=ONSET_PEAK_DISTANCE,
        )

        # 6. Convert frame indices to time
        syllable_times = librosa.frames_to_time(
            peaks, sr=sr, hop_length=hop_length
        ).tolist()

        # Filter out very early peaks (first 50ms often artifacts)
        syllable_times = [t for t in syllable_times if t >= 0.05]

        logger.info(
            f"Detected {len(syllable_times)} syllable peaks "
            f"in {len(audio)/sr:.2f}s audio"
        )

        return syllable_times

    except Exception as e:
        logger.error(f"Syllable detection failed: {e}")
        return []


# ----------------------------------------------------
# Breathing Event Extraction
# ----------------------------------------------------


def extract_breath_timestamps(
    audio: np.ndarray,
    sr: int = SR,
) -> List[float]:
    """
    Extract breath event timestamps using the existing breathing detector.

    Parameters
    ----------
    audio : np.ndarray
        Audio signal (mono).
    sr : int
        Sampling rate. Default 16000.

    Returns
    -------
    List[float]
        List of breath event start times in seconds.
        Example: [0.88, 2.41, 4.95]
    """
    try:
        if len(audio) < sr * 0.5:
            logger.warning("Audio too short for breathing detection")
            return []

        # Use existing VAD-based breathing detector
        frame_labels, times = classify_frames(audio, sr=sr)
        breath_events = extract_breath_events(frame_labels, times)

        # Extract start times
        breath_times = [event["start"] for event in breath_events]

        logger.info(f"Detected {len(breath_times)} breath events")

        return breath_times

    except Exception as e:
        logger.error(f"Breathing detection failed: {e}")
        return []


# ----------------------------------------------------
# Alignment Scoring
# ----------------------------------------------------


def compute_alignment_score(
    breath_times: List[float],
    syllable_times: List[float],
    reward_window: float = REWARD_WINDOW,
    penalty_window: float = PENALTY_WINDOW,
    max_offset: float = MAX_OFFSET,
) -> Dict[str, Any]:
    """
    Compute alignment score between breathing events and syllable timestamps.

    Scoring Logic:
    - For each breath event, find the nearest syllable timestamp
    - If breath occurs shortly AFTER a syllable (within reward_window), reward it
    - If breath overlaps with speech (too close to syllable), penalize it
    - Consistent breathing rhythm increases the score

    Parameters
    ----------
    breath_times : List[float]
        Breath event timestamps in seconds.
    syllable_times : List[float]
        Syllable timestamps in seconds.
    reward_window : float
        Time window in seconds for rewarding aligned breaths. Default 0.15s.
    penalty_window : float
        Time window in seconds for penalizing overlapping breaths. Default 0.10s.
    max_offset : float
        Maximum offset to consider for alignment. Default 0.5s.

    Returns
    -------
    Dict[str, Any]
        {
            "alignment_score": float (0-1),
            "mean_offset": float (seconds),
            "cadence_regularity": float (0-1),
            "breaths": int,
            "syllables": int
        }
    """
    # Handle edge cases
    if not breath_times or not syllable_times:
        return {
            "alignment_score": 0.0,
            "mean_offset": 0.0,
            "cadence_regularity": 0.0,
            "breaths": len(breath_times),
            "syllables": len(syllable_times),
        }

    # Convert to numpy arrays for efficient computation
    breath_arr = np.array(breath_times)
    syllable_arr = np.array(syllable_times)

    # For each breath, find nearest syllable
    offsets = []
    rewards = []

    for breath_time in breath_times:
        # Find nearest syllable
        distances = np.abs(syllable_arr - breath_time)
        nearest_idx = np.argmin(distances)
        nearest_syllable = syllable_arr[nearest_idx]
        offset = abs(breath_time - nearest_syllable)

        # Only consider offsets within max_offset
        if offset <= max_offset:
            offsets.append(offset)

            # Reward if breath occurs shortly AFTER syllable
            # (natural breathing often follows speech)
            if 0 < offset <= reward_window:
                # Check if breath is after syllable (not before)
                if breath_time >= nearest_syllable:
                    rewards.append(1.0)
                else:
                    rewards.append(0.5)
            # Penalty if breath overlaps speech (too close)
            elif offset < penalty_window:
                rewards.append(-0.5)
            # Neutral zone
            else:
                rewards.append(0.0)
        else:
            # Breath too far from any syllable
            offsets.append(max_offset)
            rewards.append(-0.3)

    # Compute mean offset
    mean_offset = float(np.mean(offsets)) if offsets else 0.0

    # Compute base alignment score from rewards
    if rewards:
        # Normalize rewards to 0-1 range
        # rewards range from -0.5 to 1.0
        reward_sum = sum(rewards)
        reward_max = len(rewards)  # Max possible reward
        reward_min = -0.5 * len(rewards)  # Min possible reward

        # Scale to 0-1
        if reward_max > reward_min:
            alignment_score = (reward_sum - reward_min) / (reward_max - reward_min)
        else:
            alignment_score = 0.0

        # Clamp to [0, 1]
        alignment_score = max(0.0, min(1.0, alignment_score))
    else:
        alignment_score = 0.0

    # Compute cadence regularity
    cadence_regularity = _compute_cadence_regularity(breath_times)

    result = {
        "alignment_score": round(alignment_score, 4),
        "mean_offset": round(mean_offset, 4),
        "cadence_regularity": round(cadence_regularity, 4),
        "breaths": len(breath_times),
        "syllables": len(syllable_times),
    }

    logger.info(
        f"Alignment score: {alignment_score:.4f}, "
        f"mean offset: {mean_offset:.4f}s, "
        f"cadence regularity: {cadence_regularity:.4f}"
    )

    return result


def _compute_cadence_regularity(
    breath_times: List[float],
    window: int = REGULARITY_WINDOW,
) -> float:
    """
    Compute how regular the breathing cadence is.

    Natural breathing has some variability but not too much.
    Too regular = suspicious (synthetic).
    Too irregular = also suspicious.

    Parameters
    ----------
    breath_times : List[float]
        Breath event timestamps.
    window : int
        Number of consecutive intervals to check. Default 3.

    Returns
    -------
    float
        Regularity score (0-1). Higher = more natural.
    """
    if len(breath_times) < MIN_BREATHS_FOR_REGULARITY:
        return 0.0

    # Compute intervals between consecutive breaths
    intervals = np.diff(breath_times)

    if len(intervals) < 2:
        return 0.5  # Neutral score for very few breaths

    # Compute coefficient of variation (CV)
    # Natural breathing: CV typically 0.2-0.5
    # Too regular (TTS): CV < 0.1
    # Too irregular: CV > 0.8
    mean_interval = np.mean(intervals)
    std_interval = np.std(intervals)

    if mean_interval > 0:
        cv = std_interval / mean_interval
    else:
        return 0.0

    # Score based on CV
    # Optimal range: 0.2-0.5
    if 0.2 <= cv <= 0.5:
        regularity = 1.0
    elif cv < 0.2:
        # Too regular (suspicious)
        regularity = cv / 0.2
    elif cv <= 0.8:
        # Acceptable range
        regularity = 1.0 - (cv - 0.5) / 0.3
    else:
        # Too irregular
        regularity = 0.0

    # Clamp to [0, 1]
    regularity = max(0.0, min(1.0, regularity))

    return regularity


# ----------------------------------------------------
# Core Analysis (shared between file-path and array overloads)
# ----------------------------------------------------


def _analyze_core(
    audio: np.ndarray,
    sr: int = SR,
    start_time: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Core analysis logic shared by both overloads of analyze_breathing_alignment.

    Parameters
    ----------
    audio : np.ndarray
        Audio signal (mono).
    sr : int
        Sampling rate.
    start_time : Optional[float]
        Start time from time.perf_counter() for measuring processing time.
        If None, uses current time.

    Returns
    -------
    Dict[str, Any]
        Analysis result with alignment_score, cadence, breath_count, etc.
    """
    if start_time is None:
        start_time = time.perf_counter()

    duration = len(audio) / sr

    # Edge case: very short audio
    if duration < 0.5:
        logger.warning(f"Audio too short: {duration:.2f}s")
        return _default_result(
            "Insufficient Data", 0, 0, 0.0, 0.0, time.perf_counter() - start_time
        )

    # Edge case: silent audio (check RMS)
    rms = np.sqrt(np.mean(audio**2))
    if rms < 1e-5:
        logger.warning("Audio appears to be silent")
        return _default_result(
            "Insufficient Data", 0, 0, 0.0, 0.0, time.perf_counter() - start_time
        )

    # Step 1: Detect syllables
    syllable_times = detect_syllable_peaks(audio, sr=sr)

    # Step 2: Detect breathing events
    breath_times = extract_breath_timestamps(audio, sr=sr)

    # Edge case: no breathing detected
    if not breath_times:
        logger.warning("No breathing events detected")
        return _default_result(
            "Insufficient Data",
            0,
            len(syllable_times),
            0.0,
            0.0,
            time.perf_counter() - start_time,
        )

    # Step 3: Compute alignment score
    alignment_result = compute_alignment_score(breath_times, syllable_times)

    # Step 4: Determine cadence label
    alignment_score = alignment_result["alignment_score"]
    regularity = alignment_result["cadence_regularity"]

    if alignment_score >= 0.6 and regularity >= 0.4:
        cadence = "Natural"
    elif alignment_score < 0.4 or regularity < 0.3:
        cadence = "Suspicious"
    else:
        cadence = "Uncertain"

    processing_time = time.perf_counter() - start_time

    result = {
        "alignment_score": alignment_result["alignment_score"],
        "cadence": cadence,
        "breath_count": alignment_result["breaths"],
        "syllable_count": alignment_result["syllables"],
        "regularity": alignment_result["cadence_regularity"],
        "mean_offset": alignment_result["mean_offset"],
        "processing_time": round(processing_time, 4),
    }

    logger.info(
        f"Breathing alignment analysis completed in {processing_time:.2f}s: "
        f"cadence={cadence}, score={alignment_score:.4f}, "
        f"breaths={result['breath_count']}, syllables={result['syllable_count']}"
    )

    return result


# ----------------------------------------------------
# Main Analysis Function (file path overload)
# ----------------------------------------------------


def analyze_breathing_alignment(
    audio_path: str,
    sr: int = SR,
    max_duration_sec: float = 30.0,
) -> Dict[str, Any]:
    """
    Analyze breathing cadence alignment from an audio file path.

    Parameters
    ----------
    audio_path : str
        Path to audio file.
    sr : int
        Sampling rate. Default 16000.
    max_duration_sec : float
        Maximum audio duration to process. Default 30s for performance.

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
        # Load audio
        audio, loaded_sr = librosa.load(audio_path, sr=sr, mono=True)

        # Limit duration for performance
        max_samples = int(max_duration_sec * sr)
        if len(audio) > max_samples:
            audio = audio[:max_samples]
            logger.info(f"Limited analysis to first {max_duration_sec}s")

        return _analyze_core(audio, sr=sr, start_time=start_time)

    except Exception as e:
        logger.error(f"Breathing alignment analysis failed: {e}", exc_info=True)
        return _default_result(
            "Error", 0, 0, 0.0, 0.0, time.perf_counter() - start_time
        )


def analyze_breathing_alignment_from_array(
    audio: np.ndarray,
    sr: int = SR,
) -> Dict[str, Any]:
    """
    Analyze breathing cadence alignment from a pre-loaded numpy audio array.

    This overload allows the backend to skip the file I/O round-trip.

    Parameters
    ----------
    audio : np.ndarray
        Audio signal (mono, float32).
    sr : int
        Sampling rate. Default 16000.

    Returns
    -------
    Dict[str, Any]
        Same format as analyze_breathing_alignment().
    """
    return _analyze_core(audio, sr=sr, start_time=time.perf_counter())


def _default_result(
    cadence: str,
    breath_count: int,
    syllable_count: int,
    regularity: float,
    mean_offset: float,
    processing_time: float,
) -> Dict[str, Any]:
    """Return default result for error/edge cases."""
    return {
        "alignment_score": 0.0,
        "cadence": cadence,
        "breath_count": breath_count,
        "syllable_count": syllable_count,
        "regularity": regularity,
        "mean_offset": mean_offset,
        "processing_time": round(processing_time, 4),
    }


# ----------------------------------------------------
# CLI Interface
# ----------------------------------------------------


if __name__ == "__main__":
    import argparse
    import json

    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(
        description="Analyze breathing cadence alignment in audio"
    )
    parser.add_argument("--audio_path", required=True, help="Path to audio file")
    parser.add_argument(
        "--max_duration", type=float, default=30.0, help="Max duration to process (s)"
    )
    args = parser.parse_args()

    result = analyze_breathing_alignment(
        args.audio_path, max_duration_sec=args.max_duration
    )
    print(json.dumps(result, indent=2))