"""
dataset.py
PyTorch Dataset wrapping the augmented audio manifest, plus train/val/test split.
"""

import json
import random
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader

from AcousticSpace.scripts.features import extract_features_from_file


class AcousticSpaceDataset(Dataset):
    """
    Reads a manifest.json (produced by augment.py) and serves
    (feature_tensor, label) pairs.

    label = mismatch_label -> 0 (consistent / likely real) or 1 (inconsistent / likely fake)
    """

    def __init__(self, manifest_entries, feature_type="melspec"):
        self.entries = manifest_entries
        self.feature_type = feature_type

    def __len__(self):
        return len(self.entries)

    def __getitem__(self, idx):
        entry = self.entries[idx]
        feat = extract_features_from_file(entry["file"], self.feature_type)
        feat_tensor = torch.tensor(feat).unsqueeze(0)  # add channel dim -> (1, n_mels, time)
        label = torch.tensor(entry["mismatch_label"], dtype=torch.long)
        return feat_tensor, label


def load_manifest(manifest_path):
    with open(manifest_path, "r") as f:
        return json.load(f)


def split_manifest(manifest, val_ratio=0.15, test_ratio=0.15, seed=42):
    """
    Splits manifest entries into train/val/test. Test set stays untouched until final eval.

    Guarantees at least 1 sample in val/test whenever the dataset has enough
    entries to support it, to avoid empty-loader crashes on small datasets
    (e.g. during early pipeline testing before the full dataset is ready).
    """
    random.seed(seed)
    entries = manifest.copy()
    random.shuffle(entries)

    n = len(entries)
    if n < 3:
        raise ValueError(
            f"Manifest has only {n} entries. Need at least 3 (1 train, 1 val, 1 test) "
            "to build a valid split. Add more augmented samples first."
        )

    n_test = max(1, int(n * test_ratio))
    n_val = max(1, int(n * val_ratio))

    # Ensure train set isn't emptied out by rounding on small datasets
    while n_test + n_val >= n:
        if n_val > 1:
            n_val -= 1
        elif n_test > 1:
            n_test -= 1
        else:
            break

    test_entries = entries[:n_test]
    val_entries = entries[n_test : n_test + n_val]
    train_entries = entries[n_test + n_val :]

    return train_entries, val_entries, test_entries


def get_dataloaders(manifest_path, batch_size=16, feature_type="melspec", num_workers=2):
    manifest = load_manifest(manifest_path)
    train_entries, val_entries, test_entries = split_manifest(manifest)

    train_ds = AcousticSpaceDataset(train_entries, feature_type)
    val_ds = AcousticSpaceDataset(val_entries, feature_type)
    test_ds = AcousticSpaceDataset(test_entries, feature_type)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)

    print(f"Train: {len(train_ds)} | Val: {len(val_ds)} | Test: {len(test_ds)}")
    return train_loader, val_loader, test_loader


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest_path", default="data/augmented/manifest.json")
    parser.add_argument("--batch_size", type=int, default=16)
    args = parser.parse_args()

    train_loader, val_loader, test_loader = get_dataloaders(args.manifest_path, args.batch_size)

    # Quick sanity check
    feat, label = next(iter(train_loader))
    print(f"Batch feature shape: {feat.shape}, label shape: {label.shape}")
