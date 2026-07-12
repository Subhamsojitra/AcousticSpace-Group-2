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
        raise RuntimeError("Training set is empty — check your manifest and split ratios.")

    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0, 0, 0

    for feats, labels in tqdm(loader, desc="Validating"):
        feats, labels = feats.to(device), labels.to(device)
        outputs = model(feats)
        loss = criterion(outputs, labels)

        total_loss += loss.item() * feats.size(0)
        preds = outputs.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    if total == 0:
        raise RuntimeError("Validation set is empty — check your manifest and split ratios.")

    return total_loss / total, correct / total


def main(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    train_loader, val_loader, test_loader = get_dataloaders(
        args.manifest_path, batch_size=args.batch_size
    )

    model = CNNBaseline(num_classes=2).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=args.lr)

    best_val_acc = 0
    history = []

    for epoch in range(args.epochs):
        train_loss, train_acc = train_one_epoch(model, train_loader, optimizer, criterion, device)
        val_loss, val_acc = evaluate(model, val_loader, criterion, device)

        print(
            f"Epoch {epoch+1}/{args.epochs} | "
            f"Train Loss: {train_loss:.4f} Acc: {train_acc:.4f} | "
            f"Val Loss: {val_loss:.4f} Acc: {val_acc:.4f}"
        )
        history.append(
            {"epoch": epoch + 1, "train_loss": train_loss, "train_acc": train_acc,
             "val_loss": val_loss, "val_acc": val_acc}
        )

        os.makedirs("results", exist_ok=True)

        # Always save the latest checkpoint so a model file always exists,
        # even if val accuracy never beats the running best (can happen on
        # tiny/imbalanced val sets, or an unlucky first epoch).
        torch.save(model.state_dict(), "results/cnn_baseline_last.pt")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), "results/cnn_baseline_best.pt")

    os.makedirs("results", exist_ok=True)
    with open("results/baseline_training_history.json", "w") as f:
        json.dump(history, f, indent=2)

    if not os.path.exists("results/cnn_baseline_best.pt"):
        print(
            "WARNING: validation accuracy never improved on the initial 0.0 baseline "
            "(likely too few val samples). Falling back to the last epoch's checkpoint."
        )
        import shutil
        shutil.copy("results/cnn_baseline_last.pt", "results/cnn_baseline_best.pt")

    print(f"Best validation accuracy: {best_val_acc:.4f}")
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
