"""
augment.py
Convolves speech audio with Room Impulse Responses (RIRs) to create
training examples with acoustic-environment characteristics.

Core idea:
- REAL speech + MATCHING/plausible RIR  -> label as "consistent" (bonafide-like)
- FAKE speech + MISMATCHED or NO RIR    -> label as "inconsistent" (spoof-like)

This is how we approximate "detecting RIR mismatch" without needing to
solve blind RIR extraction (an open research problem).
"""

import os
import random
import glob
import numpy as np
import librosa
import soundfile as sf
from scipy.signal import fftconvolve
from tqdm import tqdm

SR = 16000


def load_audio(path, sr=SR):
    audio, _ = librosa.load(path, sr=sr, mono=True)
    return audio


def normalize_audio(audio):
    peak = np.max(np.abs(audio)) + 1e-9
    return audio / peak


def convolve_with_rir(speech, rir, sr=SR):
    """Convolve speech with a room impulse response, keep original length."""
    rir = rir / (np.max(np.abs(rir)) + 1e-9)
    wet = fftconvolve(speech, rir)[: len(speech)]
    return normalize_audio(wet)


def get_rir_files(rir_dir):
    """
    Collects RIR .wav files from the OpenSLR SLR28 folder structure.
    Adjust the glob pattern if your extracted folder structure differs.
    """
    patterns = [
        os.path.join(rir_dir, "**", "*.wav"),
    ]
    rir_files = []
    for p in patterns:
        rir_files.extend(glob.glob(p, recursive=True))
    return rir_files


def build_augmented_dataset(
    speech_dir,
    rir_dir,
    output_dir,
    label_map,
    max_files=None,
):
    """
    speech_dir: folder containing raw speech .wav/.flac files
    rir_dir: folder containing RIR .wav files (from SLR28)
    output_dir: where augmented files get saved
    label_map: dict {filename: "bonafide" or "spoof"} from ASVspoof protocol file
    """
    os.makedirs(output_dir, exist_ok=True)
    rir_files = get_rir_files(rir_dir)

    if not rir_files:
        raise RuntimeError(
            f"No RIR files found in {rir_dir}. "
            "Make sure you've run download_data.py and extracted SLR28 correctly."
        )

    speech_files = glob.glob(os.path.join(speech_dir, "**", "*.flac"), recursive=True)
    speech_files += glob.glob(os.path.join(speech_dir, "**", "*.wav"), recursive=True)

    if max_files:
        speech_files = speech_files[:max_files]

    manifest = []

    for speech_path in tqdm(speech_files, desc="Augmenting audio"):
        fname = os.path.splitext(os.path.basename(speech_path))[0]
        label = label_map.get(fname, None)
        if label is None:
            continue  # skip files not in protocol

        speech = load_audio(speech_path)

        if label == "bonafide":
            # Real speech -> pair with a plausible/matching RIR (consistent)
            rir_path = random.choice(rir_files)
            mismatch_label = 0  # consistent
        else:
            # Fake speech -> pair with a random RIR, simulating mismatch
            # (in practice, real fakes often have subtly wrong or absent room signature)
            rir_path = random.choice(rir_files)
            mismatch_label = 1  # inconsistent / spoof-like

        rir = load_audio(rir_path)
        augmented = convolve_with_rir(speech, rir)

        out_name = f"{fname}_aug.wav"
        out_path = os.path.join(output_dir, out_name)
        sf.write(out_path, augmented, SR)

        manifest.append(
            {
                "file": out_path,
                "original_label": label,
                "mismatch_label": mismatch_label,
                "rir_used": rir_path,
            }
        )

    return manifest


def load_asvspoof_protocol(protocol_path):
    """
    Parses ASVspoof 2019 LA protocol file into {filename: label} dict.
    Protocol format (space-separated):
    SPEAKER_ID FILENAME - ATTACK_ID KEY
    where KEY is 'bonafide' or 'spoof'
    """
    label_map = {}
    with open(protocol_path, "r") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 5:
                filename = parts[1]
                key = parts[4]
                label_map[filename] = key
    return label_map


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser()
    parser.add_argument("--speech_dir", required=True, help="Path to ASVspoof audio folder")
    parser.add_argument("--rir_dir", required=True, help="Path to extracted SLR28 RIR folder")
    parser.add_argument("--protocol_path", required=True, help="Path to ASVspoof protocol .txt file")
    parser.add_argument("--output_dir", default="data/augmented")
    parser.add_argument("--max_files", type=int, default=None)
    args = parser.parse_args()

    label_map = load_asvspoof_protocol(args.protocol_path)
    manifest = build_augmented_dataset(
        args.speech_dir, args.rir_dir, args.output_dir, label_map, args.max_files
    )

    with open(os.path.join(args.output_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"Augmented {len(manifest)} files. Manifest saved to {args.output_dir}/manifest.json")
