"""
evaluate.py
Evaluates a trained model (baseline CNN or fine-tuned AST) on the held-out
test set. Computes accuracy, F1, confusion matrix, and EER (Equal Error Rate),
the standard metric in anti-spoofing research.
"""

import os
import sys
import json
import numpy as np
import torch
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_curve,
)

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))


def compute_eer(labels, scores):
    """
    Computes Equal Error Rate (EER) — the point where False Acceptance Rate
    equals False Rejection Rate. Standard metric in ASVspoof literature.

    Returns NaN (with a warning) if the label set doesn't contain both
    classes — this can only happen with a very small/unbalanced test set;
    it should not occur on the real dataset with a properly sized split.
    """
    labels = np.asarray(labels)
    if len(np.unique(labels)) < 2:
        print(
            "WARNING: EER undefined — test set contains only one class. "
            "This should not happen on the full dataset; check your split size."
        )
        return float("nan")

    fpr, tpr, thresholds = roc_curve(labels, scores)
    fnr = 1 - tpr
    eer_threshold_idx = np.nanargmin(np.absolute(fnr - fpr))
    eer = (fpr[eer_threshold_idx] + fnr[eer_threshold_idx]) / 2
    return eer


@torch.no_grad()
def evaluate_cnn_baseline(model, test_loader, device):
    model.eval()
    all_labels, all_preds, all_scores = [], [], []

    for feats, labels in test_loader:
        feats = feats.to(device)
        outputs = model(feats)
        probs = torch.softmax(outputs, dim=1)[:, 1]  # probability of class "fake/mismatch"
        preds = outputs.argmax(dim=1)

        all_labels.extend(labels.numpy())
        all_preds.extend(preds.cpu().numpy())
        all_scores.extend(probs.cpu().numpy())

    return compute_and_report(all_labels, all_preds, all_scores, model_name="CNN Baseline")


def compute_and_report(labels, preds, scores, model_name="Model"):
    acc = accuracy_score(labels, preds)
    prec = precision_score(labels, preds)
    rec = recall_score(labels, preds)
    f1 = f1_score(labels, preds)
    cm = confusion_matrix(labels, preds)
    eer = compute_eer(labels, scores)

    report = {
        "model": model_name,
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "eer": round(float(eer), 4),
        "confusion_matrix": cm.tolist(),
    }

    print(f"\n=== {model_name} Evaluation ===")
    for k, v in report.items():
        if k != "confusion_matrix":
            print(f"{k}: {v}")
    print(f"Confusion Matrix:\n{cm}")

    return report


def test_mismatch_sensitivity(model, real_voice_wrong_room_samples, device):
    """
    Special test proving the project's actual differentiator:
    feed REAL voice + WRONG room acoustics — model should still flag it
    as suspicious, proving it relies on acoustic mismatch, not just voice quality.

    real_voice_wrong_room_samples: list of preprocessed feature tensors
    """
    model.eval()
    flagged_count = 0

    with torch.no_grad():
        for feat in real_voice_wrong_room_samples:
            feat = feat.unsqueeze(0).to(device)
            output = model(feat)
            pred = output.argmax(dim=1).item()
            if pred == 1:  # flagged as mismatch/fake
                flagged_count += 1

    ratio = flagged_count / len(real_voice_wrong_room_samples)
    print(f"\nMismatch sensitivity test: {ratio*100:.1f}% of real-voice/wrong-room samples flagged")
    print("(Higher is better — proves model detects spatial mismatch, not just voice quality)")
    return ratio


if __name__ == "__main__":
    import argparse
    from models.cnn_baseline import CNNBaseline
    from AcousticSpace.scripts.dataset import get_dataloaders

    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest_path", default="data/augmented/manifest.json")
    parser.add_argument("--model_path", default="results/cnn_baseline_best.pt")
    parser.add_argument("--batch_size", type=int, default=16)
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    _, _, test_loader = get_dataloaders(args.manifest_path, args.batch_size)

    model = CNNBaseline(num_classes=2).to(device)
    model.load_state_dict(torch.load(args.model_path, map_location=device))

    report = evaluate_cnn_baseline(model, test_loader, device)

    os.makedirs("results", exist_ok=True)
    with open("results/baseline_eval_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print("\nReport saved to results/baseline_eval_report.json")
