"""
analyze.py
THE HANDOFF FILE. This is what the backend/FastAPI team imports and calls.

Combines:
- AST model prediction (primary signal: acoustic mismatch / fake detection)
- Breathing heuristic (secondary signal)

Usage (by backend team):
    from analyze import analyze
    result = analyze("path/to/uploaded_audio.wav")
"""

import os
import numpy as np
import torch
import librosa
from transformers import ASTForAudioClassification, ASTFeatureExtractor

from breathing_detector import flag_irregular_breathing
from acoustic_features import extract_all_acoustic_features

SR = 16000
MODEL_PATH = os.environ.get("AST_MODEL_PATH", "results/ast_final_model")

_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_model = None
_feature_extractor = None


def _load_model():
    """Lazy-loads the model once, reused across calls (avoids reloading per request)."""
    global _model, _feature_extractor
    if _model is None:
        print(f"Loading AST model from {MODEL_PATH} ...")
        _model = ASTForAudioClassification.from_pretrained(MODEL_PATH).to(_device)
        _model.eval()
        _feature_extractor = ASTFeatureExtractor.from_pretrained(MODEL_PATH)
    return _model, _feature_extractor


def analyze(audio_path):
    """
    Main entry point for the backend.

    Args:
        audio_path: path to an uploaded audio file (wav/flac/mp3)

    Returns:
        dict:
        {
            "confidence_score": float (0-1, probability audio is fake/mismatched),
            "prediction": "real" | "fake",
            "reverb_mismatch_flag": bool,
            "breathing_flag": bool,
            "breathing_details": dict
        }
    """
    model, feature_extractor = _load_model()

    # Load and standardize audio
    audio, _ = librosa.load(audio_path, sr=SR, mono=True)

    # --- Primary signal: AST model ---
    inputs = feature_extractor(audio, sampling_rate=SR, return_tensors="pt")
    input_values = inputs["input_values"].to(_device)

    with torch.no_grad():
        outputs = model(input_values)
        probs = torch.softmax(outputs.logits, dim=1)[0]
        confidence_score = probs[1].item()  # probability of class 1 = mismatch/fake
        prediction = "fake" if confidence_score > 0.5 else "real"
        reverb_mismatch_flag = confidence_score > 0.5

    # --- Secondary signal: breathing heuristic (VAD-based, v2) ---
    breathing_result = flag_irregular_breathing(audio, sr=SR)

    # --- Tertiary signal: blind acoustic features (RT60/DRR/clarity) ---
    # These are diagnostic/explainable evidence for the analyst dashboard.
    # Not yet fused into the AST model's decision (see FusionClassifier stub
    # in acoustic_features.py for the extension path if retraining time allows).
    acoustic_result = extract_all_acoustic_features(audio_path)

    return {
        "confidence_score": round(confidence_score, 4),
        "prediction": prediction,
        "reverb_mismatch_flag": reverb_mismatch_flag,
        "breathing_flag": breathing_result["breathing_flag"],
        "breathing_details": breathing_result,
        "acoustic_features": acoustic_result,
    }


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True, help="Path to audio file to analyze")
    args = parser.parse_args()

    result = analyze(args.audio)
    print(json.dumps(result, indent=2))
