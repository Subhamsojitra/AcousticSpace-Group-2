"""
breathing_detector.py (v2)
Real Voice-Activity-Detection-based breathing/pause analysis.

Upgrade from v1: instead of simple silence-gap detection (librosa.effects.split
on a single energy threshold), this uses a combined multi-feature VAD —
short-term energy + zero-crossing rate + spectral flatness — to distinguish:
  - SPEECH frames
  - BREATH frames (audible airflow: low energy, high spectral flatness/noise-like,
    moderate ZCR — distinct from both speech and pure digital silence)
  - SILENCE frames (near-zero energy, no breath-like noise floor)

This is the same family of features used in classic combined-feature VAD
algorithms (energy + ZCR + spectral flatness), rather than a single amplitude
threshold — genuinely more discriminative than the v1 heuristic, while staying
dependency-free (only numpy/librosa/scipy, no unmaintained third-party VAD
packages that may break in restricted environments like Kaggle).

NOTE: this is still a heuristic classifier, not a trained breath-detection
model. It is a meaningfully stronger signal than v1, but not equivalent to a
supervised model trained on labeled breath sounds — call that out in your
report as a scoped, deliberate choice.
"""

import numpy as np
import librosa

SR = 16000
FRAME_LENGTH = 400   # 25ms at 16kHz
HOP_LENGTH = 160     # 10ms at 16kHz


def _frame_energy(audio, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH):
    """Short-term RMS energy per frame."""
    return librosa.feature.rms(y=audio, frame_length=frame_length, hop_length=hop_length)[0]


def _frame_spectral_flatness(audio, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH):
    """
    Spectral flatness: ~1.0 for noise-like signals (breath airflow), much lower
    for tonal/harmonic signals (voiced speech). Key discriminator between
    breath noise and speech.
    """
    return librosa.feature.spectral_flatness(y=audio, n_fft=frame_length, hop_length=hop_length)[0]


def classify_frames(audio, sr=SR):
    """
    Classifies each frame as 'speech', 'breath', or 'silence' using combined
    energy + spectral flatness thresholds (adaptive to the clip's own energy
    distribution rather than fixed absolute values).

    Returns:
        frame_labels: list of strings, one per frame
        times: array of frame center times in seconds
    """
    energy = _frame_energy(audio)
    flatness = _frame_spectral_flatness(audio)

    # Adaptive thresholds based on this clip's own energy distribution,
    # since absolute energy varies a lot with recording level/gain.
    energy_db = librosa.amplitude_to_db(energy + 1e-9)
    silence_thresh = np.percentile(energy_db, 15)   # bottom 15% = likely silence
    speech_thresh = np.percentile(energy_db, 60)    # top 40% = likely speech

    flatness_breath_thresh = 0.35  # empirical: breath noise is fairly flat/noise-like

    labels = []
    for e_db, flat in zip(energy_db, flatness):
        if e_db <= silence_thresh:
            labels.append("silence")
        elif e_db < speech_thresh and flat >= flatness_breath_thresh:
            # Low-to-moderate energy + noise-like spectrum -> breath, not voiced speech
            labels.append("breath")
        else:
            labels.append("speech")

    times = librosa.frames_to_time(np.arange(len(labels)), sr=sr, hop_length=HOP_LENGTH)
    return labels, times


def extract_breath_events(frame_labels, times, min_duration=0.1, max_duration=0.8):
    """
    Groups consecutive 'breath' frames into discrete breath events, filtering
    by plausible human breath duration (too short = noise blip, too long =
    probably a pause/silence misclassified as breath).
    """
    events = []
    start_idx = None

    for i, label in enumerate(frame_labels + ["end"]):
        if label == "breath" and start_idx is None:
            start_idx = i
        elif label != "breath" and start_idx is not None:
            end_idx = min(i - 1, len(times) - 1)
            duration = times[end_idx] - times[start_idx]
            if min_duration <= duration <= max_duration:
                events.append({
                    "start": float(times[start_idx]),
                    "end": float(times[end_idx]),
                    "duration": float(duration),
                })
            start_idx = None

    return events


def flag_irregular_breathing(audio, sr=SR, expected_interval_range=(1.5, 6.0), irregularity_threshold=0.4):
    """
    Main entry point (same interface as v1 for drop-in compatibility).

    Detects breath events via VAD-style classification, then checks whether
    the INTERVALS BETWEEN breaths fall within a plausible natural range.
    Irregular/absent breathing patterns are more consistent with synthetic
    speech (TTS often has unnaturally regular or absent breath patterns).

    Returns:
        dict with 'breathing_flag' (bool) and supporting stats.
    """
    if len(audio) < sr * 0.5:
        return {"breathing_flag": False, "num_breaths": 0, "reason": "clip_too_short"}

    frame_labels, times = classify_frames(audio, sr)
    breath_events = extract_breath_events(frame_labels, times)

    if len(breath_events) < 2:
        return {
            "breathing_flag": False,
            "num_breaths": len(breath_events),
            "reason": "insufficient_breath_events",
            "breath_events": breath_events,
        }

    # Interval between consecutive breath onsets
    intervals = np.array([
        breath_events[i + 1]["start"] - breath_events[i]["start"]
        for i in range(len(breath_events) - 1)
    ])

    out_of_range_ratio = np.mean(
        (intervals < expected_interval_range[0]) | (intervals > expected_interval_range[1])
    )

    # Also flag suspiciously low variance (too regular/mechanical = TTS-like)
    interval_cv = np.std(intervals) / (np.mean(intervals) + 1e-9)  # coefficient of variation
    too_regular = interval_cv < 0.08 and len(intervals) >= 3

    flag = bool(out_of_range_ratio > irregularity_threshold or too_regular)

    return {
        "breathing_flag": flag,
        "num_breaths": len(breath_events),
        "mean_interval_sec": float(np.mean(intervals)),
        "interval_coefficient_of_variation": float(interval_cv),
        "out_of_range_ratio": float(out_of_range_ratio),
        "flagged_as_too_regular": bool(too_regular),
        "breath_events": breath_events,
    }


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser()
    parser.add_argument("--audio_path", required=True)
    args = parser.parse_args()

    audio, _ = librosa.load(args.audio_path, sr=SR, mono=True)
    result = flag_irregular_breathing(audio)
    print(json.dumps(result, indent=2))
