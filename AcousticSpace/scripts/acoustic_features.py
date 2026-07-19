"""
acoustic_features.py
Blind, single-channel estimation of room-acoustic features:
  - RT60 (reverberation time)
  - EDC (Energy Decay Curve)
  - DRR proxy (Direct-to-Reverberant Ratio)
  - Clarity proxy (C50-style early/late energy ratio)

IMPORTANT SCOPE NOTE:
True RT60/DRR/C50 measurement requires an actual measured Room Impulse
Response (an impulse played and recorded in the room). We don't have that —
we only have a single reverberant speech recording. What this module does
is BLIND estimation: it finds naturally-occurring "free decay" regions
(the reverberant tail right after speech cuts off, before the next word
starts) and treats those as a proxy impulse response tail. This is the same
family of technique used in blind reverberation-time estimation research —
approximate, but a real, defensible acoustic measurement rather than a
guess, and meaningfully stronger evidence than spectrograms alone.

These features are meant to be used ALONGSIDE the AST spectrogram model,
either as:
  (a) diagnostic/explainable output shown to the analyst directly, or
  (b) concatenated into a fusion classifier (see FusionClassifier stub
      at the bottom) if you have time to retrain with the extra input.
"""

import numpy as np
import librosa

SR = 16000
FRAME_LENGTH = 400
HOP_LENGTH = 160
MIN_DECAY_REGION_SEC = 0.15   # ignore decay windows shorter than this (too short to fit a slope)
MAX_DECAY_REGION_SEC = 0.6    # cap window length (avoid bleeding into the next word)


def _energy_envelope(audio, sr=SR, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH):
    rms = librosa.feature.rms(y=audio, frame_length=frame_length, hop_length=hop_length)[0]
    times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
    return rms, times


def _find_free_decay_regions(audio, sr=SR):
    """
    Finds candidate 'free decay' regions: short windows right after a speech
    segment ends and before the next one begins, where only the room's
    reverberant tail is decaying with no new direct sound.

    Uses librosa's onset-based segmentation rather than a fixed threshold,
    so it adapts per-clip.
    """
    rms, times = _energy_envelope(audio, sr=sr)
    energy_db = librosa.amplitude_to_db(rms + 1e-9)

    # Adaptive speech/silence split based on this clip's own energy distribution
    speech_thresh = np.percentile(energy_db, 55)

    is_speech = energy_db > speech_thresh

    regions = []
    i = 0
    n = len(is_speech)
    while i < n:
        if is_speech[i]:
            # find end of this speech segment
            j = i
            while j < n and is_speech[j]:
                j += 1
            # decay region starts right after speech ends (index j)
            decay_start = j
            k = j
            while k < n and not is_speech[k]:
                k += 1
            decay_end = k

            start_t = times[decay_start] if decay_start < len(times) else None
            end_t = times[min(decay_end, len(times) - 1)] if decay_end < len(times) else None

            if start_t is not None and end_t is not None:
                duration = end_t - start_t
                if MIN_DECAY_REGION_SEC <= duration <= MAX_DECAY_REGION_SEC:
                    regions.append((decay_start, min(decay_end, len(rms))))

            i = k
        else:
            i += 1

    return regions, rms, times


def estimate_rt60_and_edc(audio, sr=SR):
    """
    Estimates RT60 by averaging slope-based estimates from each free-decay
    region found in the clip (Schroeder-style backward energy integration,
    applied to the RMS envelope of each candidate decay window).

    Returns:
        dict with rt60_estimate_sec, num_decay_regions_used, edc_curves (list
        of dB-normalized decay curves for visualization), and a confidence
        flag based on how many usable regions were found.
    """
    regions, rms, times = _find_free_decay_regions(audio, sr)

    if len(regions) == 0:
        return {
            "rt60_estimate_sec": None,
            "num_decay_regions_used": 0,
            "confidence": "low",
            "reason": "no_usable_decay_regions_found",
            "edc_curves": [],
        }

    rt60_estimates = []
    edc_curves = []

    for start_idx, end_idx in regions:
        segment = rms[start_idx:end_idx]
        if len(segment) < 3:
            continue

        # Schroeder backward integration: EDC(t) = sum of energy from t to end
        energy = segment ** 2
        edc = np.cumsum(energy[::-1])[::-1]
        edc = edc / (edc[0] + 1e-12)
        edc_db = 10 * np.log10(edc + 1e-12)
        edc_curves.append(edc_db.tolist())

        # Fit a line to the decay from -5dB to as low as we can reliably see
        # (commonly -5 to -25dB range = T20 method, extrapolated to T60)
        valid_mask = (edc_db <= -1) & (edc_db >= -25)
        if valid_mask.sum() < 3:
            continue

        t = np.arange(len(edc_db))[valid_mask] * (HOP_LENGTH / sr)
        y = edc_db[valid_mask]

        # Linear regression: y = slope * t + intercept
        slope, intercept = np.polyfit(t, y, 1)
        if slope >= 0:
            continue  # invalid (not decaying) — skip this region

        rt60 = -60.0 / slope
        # Sanity bound: realistic room RT60 is roughly 0.1–2.5 sec
        if 0.05 <= rt60 <= 3.0:
            rt60_estimates.append(rt60)

    if not rt60_estimates:
        return {
            "rt60_estimate_sec": None,
            "num_decay_regions_used": 0,
            "confidence": "low",
            "reason": "no_valid_slope_fits",
            "edc_curves": edc_curves,
        }

    confidence = "high" if len(rt60_estimates) >= 5 else ("medium" if len(rt60_estimates) >= 2 else "low")

    return {
        "rt60_estimate_sec": float(np.median(rt60_estimates)),
        "rt60_std_sec": float(np.std(rt60_estimates)),
        "num_decay_regions_used": len(rt60_estimates),
        "confidence": confidence,
        "edc_curves": edc_curves,
    }


def estimate_drr_proxy(audio, sr=SR):
    """
    Direct-to-Reverberant Ratio proxy: ratio of energy right at speech onset
    (direct sound spike) vs. the average energy in the decay tail immediately
    following. Higher DRR = more direct/dry sound; lower DRR = more reverberant.

    This is a proxy, not a true DRR (which requires the actual impulse
    response's direct peak vs. reverberant tail energy split).
    """
    regions, rms, times = _find_free_decay_regions(audio, sr)

    if len(regions) == 0:
        return {"drr_proxy_db": None, "confidence": "low"}

    drr_values = []
    for start_idx, end_idx in regions:
        if start_idx < 2 or end_idx <= start_idx:
            continue
        # "direct" energy = last speech frame right before decay starts
        direct_energy = rms[start_idx - 1] ** 2
        # "reverberant tail" = mean energy across the decay region
        tail_energy = np.mean(rms[start_idx:end_idx] ** 2) + 1e-12

        if direct_energy <= 0:
            continue

        drr_db = 10 * np.log10(direct_energy / tail_energy)
        drr_values.append(drr_db)

    if not drr_values:
        return {"drr_proxy_db": None, "confidence": "low"}

    confidence = "high" if len(drr_values) >= 5 else ("medium" if len(drr_values) >= 2 else "low")
    return {
        "drr_proxy_db": float(np.median(drr_values)),
        "num_regions_used": len(drr_values),
        "confidence": confidence,
    }


def estimate_clarity_proxy(audio, sr=SR, split_ms=50):
    """
    C50-style clarity proxy: ratio of energy in the first `split_ms` of each
    decay region vs. the remaining energy. Real C50 is computed from an
    actual RIR; this is the same ratio concept applied to our free-decay
    proxy regions.
    """
    regions, rms, times = _find_free_decay_regions(audio, sr)
    hop_sec = HOP_LENGTH / sr
    split_frames = max(1, int((split_ms / 1000) / hop_sec))

    clarity_values = []
    for start_idx, end_idx in regions:
        segment = rms[start_idx:end_idx] ** 2
        if len(segment) < split_frames + 1:
            continue
        early = np.sum(segment[:split_frames])
        late = np.sum(segment[split_frames:]) + 1e-12
        clarity_db = 10 * np.log10(early / late + 1e-12)
        clarity_values.append(clarity_db)

    if not clarity_values:
        return {"clarity_c50_proxy_db": None, "confidence": "low"}

    confidence = "high" if len(clarity_values) >= 5 else ("medium" if len(clarity_values) >= 2 else "low")
    return {
        "clarity_c50_proxy_db": float(np.median(clarity_values)),
        "num_regions_used": len(clarity_values),
        "confidence": confidence,
    }


def extract_all_acoustic_features(audio_path):
    """
    Convenience function: loads audio and returns all blind acoustic
    features in one dict, ready to attach to the analyze() output or
    feed into a fusion classifier.
    """
    audio, _ = librosa.load(audio_path, sr=SR, mono=True)

    rt60_result = estimate_rt60_and_edc(audio, SR)
    drr_result = estimate_drr_proxy(audio, SR)
    clarity_result = estimate_clarity_proxy(audio, SR)

    return {
        "rt60": rt60_result,
        "drr": drr_result,
        "clarity": clarity_result,
    }


# ---------------------------------------------------------------------------
# Optional fusion classifier stub — combines AST logits with these acoustic
# features. NOT trained by default (needs a training script + labeled data
# pass with these features attached). Included as an architecture reference
# if you have time to extend the project past the core deliverable.
# ---------------------------------------------------------------------------
import torch
import torch.nn as nn


class FusionClassifier(nn.Module):
    """
    Combines AST's pooled output/logits with a small vector of blind acoustic
    features (RT60, DRR proxy, clarity proxy) through a small MLP head.

    Usage sketch (not wired into training by default):
        ast_logits = ast_model(spectrogram).logits            # shape (batch, 2)
        acoustic_vec = torch.tensor([[rt60, drr, clarity]])    # shape (batch, 3)
        fusion_model = FusionClassifier(acoustic_dim=3)
        final_logits = fusion_model(ast_logits, acoustic_vec)
    """

    def __init__(self, ast_logit_dim=2, acoustic_dim=3, hidden_dim=16, num_classes=2):
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(ast_logit_dim + acoustic_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, num_classes),
        )

    def forward(self, ast_logits, acoustic_features):
        combined = torch.cat([ast_logits, acoustic_features], dim=1)
        return self.mlp(combined)


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser()
    parser.add_argument("--audio_path", required=True)
    args = parser.parse_args()

    features = extract_all_acoustic_features(args.audio_path)
    print(json.dumps(features, indent=2))
