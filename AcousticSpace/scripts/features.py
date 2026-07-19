"""
features.py
Extracts mel-spectrogram and MFCC features from audio files using Librosa.
These features are the actual input to both the CNN baseline and the AST model.
"""

import numpy as np
import librosa

SR = 16000
N_MELS = 128
N_FFT = 1024
HOP_LENGTH = 256
TARGET_FRAMES = 400  # fixed width for batching (pad/truncate)


def load_audio(path, sr=SR):
    audio, _ = librosa.load(path, sr=sr, mono=True)
    return audio


def extract_melspectrogram(audio, sr=SR):
    spec = librosa.feature.melspectrogram(
        y=audio, sr=sr, n_mels=N_MELS, n_fft=N_FFT, hop_length=HOP_LENGTH
    )
    log_spec = librosa.power_to_db(spec, ref=np.max)
    return log_spec  # shape: (N_MELS, time_frames)


def extract_mfcc(audio, sr=SR, n_mfcc=40):
    mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=n_mfcc, n_fft=N_FFT, hop_length=HOP_LENGTH)
    return mfcc


def pad_or_truncate(feature, target_frames=TARGET_FRAMES):
    """Ensures a fixed time dimension so features can be batched."""
    n_frames = feature.shape[1]
    if n_frames >= target_frames:
        return feature[:, :target_frames]
    pad_width = target_frames - n_frames
    return np.pad(feature, ((0, 0), (0, pad_width)), mode="constant", constant_values=feature.min())


def extract_features_from_file(path, feature_type="melspec"):
    """
    Main entry point: loads audio and returns a fixed-size feature array.
    feature_type: "melspec" or "mfcc"
    """
    audio = load_audio(path)

    if feature_type == "melspec":
        feat = extract_melspectrogram(audio)
    elif feature_type == "mfcc":
        feat = extract_mfcc(audio)
    else:
        raise ValueError(f"Unknown feature_type: {feature_type}")

    feat = pad_or_truncate(feat)

    # Normalize (zero mean, unit variance) — helps training stability
    feat = (feat - feat.mean()) / (feat.std() + 1e-9)
    return feat.astype(np.float32)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--audio_path", required=True)
    parser.add_argument("--feature_type", default="melspec", choices=["melspec", "mfcc"])
    args = parser.parse_args()

    feat = extract_features_from_file(args.audio_path, args.feature_type)
    print(f"Feature shape: {feat.shape}")
    print(f"Feature stats -> mean: {feat.mean():.3f}, std: {feat.std():.3f}")
