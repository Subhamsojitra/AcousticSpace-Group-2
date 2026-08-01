"""
verify_analyze.py
Runs analyze() against a sample of files from the manifest with KNOWN ground
truth labels, and reports how often the prediction matches - a real
end-to-end check of the whole pipeline (not just "did it crash").
"""

import json
import random
import sys
import os

sys.path.append(os.path.dirname(__file__))
from AcousticSpace.scripts.analyze import analyze


def main(manifest_path="data/augmented/manifest.json", n_samples=20, seed=42):
    with open(manifest_path, "r") as f:
        manifest = json.load(f)

    random.seed(seed)

    bonafide_entries = [e for e in manifest if e["mismatch_label"] == 0]
    spoof_entries = [e for e in manifest if e["mismatch_label"] == 1]

    n_bonafide = min(n_samples // 2, len(bonafide_entries))
    n_spoof = min(n_samples - n_bonafide, len(spoof_entries))

    sample = random.sample(bonafide_entries, n_bonafide) + random.sample(spoof_entries, n_spoof)
    random.shuffle(sample)

    correct = 0
    results = []

    for entry in sample:
        true_label = "fake" if entry["mismatch_label"] == 1 else "real"
        result = analyze(entry["file"])
        predicted = result["prediction"]
        is_correct = predicted == true_label
        correct += is_correct

        results.append({
            "file": os.path.basename(entry["file"]),
            "true_label": true_label,
            "predicted": predicted,
            "confidence": result["confidence_score"],
            "correct": is_correct,
        })

        status = "CORRECT" if is_correct else "WRONG"
        print(f"[{status}] {os.path.basename(entry['file']):30s} true={true_label:5s} pred={predicted:5s} conf={result['confidence_score']:.3f}")

    accuracy = correct / len(sample)
    print(f"\n{'='*50}")
    print(f"Accuracy on {len(sample)} samples ({n_bonafide} bonafide, {n_spoof} spoof): {accuracy:.2%}")
    print(f"{'='*50}")

    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest_path", default="data/augmented/manifest.json")
    parser.add_argument("--n_samples", type=int, default=20)
    args = parser.parse_args()

    main(args.manifest_path, args.n_samples)