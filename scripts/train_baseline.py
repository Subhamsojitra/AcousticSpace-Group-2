"""
train_baseline.py
Trains the CNN baseline model on the augmented dataset.
This gives you a comparison accuracy number before fine-tuning AST.
"""

import os
import sys
import json
import torch
import torch.nn as nn
import torch.optim as optim
from tqdm import tqdm

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from models.cnn_baseline import CNNBaseline
from scripts.dataset import get_dataloaders


def train_one_epoch(model, loader, optimizer, criterion, device):
    model.train()
    total_loss, correct, total = 0, 0, 0

    for feats, labels in tqdm(loader, desc="Training"):
        feats, labels = feats.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(feats)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * feats.size(0)
        preds = outputs.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    if total == 0:
        raise RuntimeError("Training set is empty - check your manifest and split ratios.")

    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0, 0, 0
    all_labels, all_preds = [], []

    for feats, labels in tqdm(loader, desc="Validating"):
        feats, labels = feats.to(device), labels.to(device)
        outputs = model(feats)
        loss = criterion(outputs, labels)

        total_loss += loss.item() * feats.size(0)
        preds = outputs.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

        all_labels.extend(labels.cpu().numpy())
        all_preds.extend(preds.cpu().numpy())

    if total == 0:
        raise RuntimeError("Validation set is empty - check your manifest and split ratios.")

    from sklearn.metrics import recall_score
    bonafide_recall = recall_score(all_labels, all_preds, pos_label=0, zero_division=0)
    spoof_recall = recall_score(all_labels, all_preds, pos_label=1, zero_division=0)

    return total_loss / total, correct / total, bonafide_recall, spoof_recall


def compute_class_weights(manifest_path, device):
    with open(manifest_path, "r") as f:
        manifest = json.load(f)

    labels = [entry["mismatch_label"] for entry in manifest]
    n_total = len(labels)
    n_class0 = labels.count(0)
    n_class1 = labels.count(1)

    if n_class0 == 0 or n_class1 == 0:
        print("WARNING: one class has zero samples - falling back to unweighted loss.")
        return None

    weight_0 = n_total / (2 * n_class0)
    weight_1 = n_total / (2 * n_class1)

    print(f"Class distribution -> bonafide: {n_class0}, spoof: {n_class1}")
    print(f"Class weights -> bonafide: {weight_0:.3f}, spoof: {weight_1:.3f}")

    return torch.tensor([weight_0, weight_1], dtype=torch.float32).to(device)


def main(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    train_loader, val_loader, test_loader = get_dataloaders(
        args.manifest_path, batch_size=args.batch_size
    )

    model = CNNBaseline(num_classes=2).to(device)
    class_weights = compute_class_weights(args.manifest_path, device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = optim.Adam(model.parameters(), lr=args.lr)

    # NOTE: selecting the "best" checkpoint by raw accuracy is a trap on
    # imbalanced data like ASVspoof - a model that always predicts "spoof"
    # scores ~92% accuracy while catching 0% of real (bonafide) audio.
    # We select by BALANCED accuracy instead: the average of bonafide
    # recall and spoof recall, so both classes have to be handled well.
    best_val_acc = 0
    best_balanced_score = 0
    history = []

    for epoch in range(args.epochs):
        train_loss, train_acc = train_one_epoch(model, train_loader, optimizer, criterion, device)
        val_loss, val_acc, bonafide_recall, spoof_recall = evaluate(model, val_loader, criterion, device)
        balanced_score = (bonafide_recall + spoof_recall) / 2

        print(
            f"Epoch {epoch+1}/{args.epochs} | "
            f"Train Loss: {train_loss:.4f} Acc: {train_acc:.4f} | "
            f"Val Loss: {val_loss:.4f} Acc: {val_acc:.4f} | "
            f"Bonafide Recall: {bonafide_recall:.4f} | Spoof Recall: {spoof_recall:.4f} | "
            f"Balanced Score: {balanced_score:.4f}"
        )
        history.append(
            {"epoch": epoch + 1, "train_loss": train_loss, "train_acc": train_acc,
             "val_loss": val_loss, "val_acc": val_acc,
             "bonafide_recall": bonafide_recall, "spoof_recall": spoof_recall,
             "balanced_score": balanced_score}
        )

        os.makedirs("results", exist_ok=True)

        torch.save(model.state_dict(), "results/cnn_baseline_last.pt")

        if balanced_score > best_balanced_score:
            best_balanced_score = balanced_score
            best_val_acc = val_acc
            torch.save(model.state_dict(), "results/cnn_baseline_best.pt")

    os.makedirs("results", exist_ok=True)
    with open("results/baseline_training_history.json", "w") as f:
        json.dump(history, f, indent=2)

    if not os.path.exists("results/cnn_baseline_best.pt"):
        print(
            "WARNING: balanced score never improved on the initial 0.0 baseline "
            "(likely too few val samples). Falling back to the last epoch's checkpoint."
        )
        import shutil
        shutil.copy("results/cnn_baseline_last.pt", "results/cnn_baseline_best.pt")

    print(f"Best balanced score (avg of bonafide/spoof recall): {best_balanced_score:.4f}")
    print(f"Corresponding validation accuracy: {best_val_acc:.4f}")
    print("Model saved to results/cnn_baseline_best.pt")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest_path", default="data/augmented/manifest.json")
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--lr", type=float, default=1e-3)
    args = parser.parse_args()

    main(args)