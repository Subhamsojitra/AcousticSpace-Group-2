"""
train_ast.py
Fine-tunes a pretrained Audio Spectrogram Transformer (AST) from HuggingFace
on the augmented dataset (real/fake speech x matched/mismatched room acoustics).

This is the main model for the project (Week 3), compared against the
CNN baseline (Week 2) to prove AST adds value.
"""

import os
import json
import numpy as np
import torch
from torch.utils.data import Dataset
from transformers import (
    ASTForAudioClassification,
    ASTFeatureExtractor,
    TrainingArguments,
    Trainer,
)
import librosa

MODEL_CHECKPOINT = "MIT/ast-finetuned-audioset-10-10-0.4593"
SR = 16000


class ASTDataset(Dataset):
    """
    Loads raw audio and lets the ASTFeatureExtractor handle spectrogram conversion
    internally (AST expects its own specific feature format).
    """

    def __init__(self, manifest_entries, feature_extractor):
        self.entries = manifest_entries
        self.feature_extractor = feature_extractor

    def __len__(self):
        return len(self.entries)

    def __getitem__(self, idx):
        entry = self.entries[idx]
        audio, _ = librosa.load(entry["file"], sr=SR, mono=True)

        inputs = self.feature_extractor(
            audio, sampling_rate=SR, return_tensors="pt"
        )
        item = {
            "input_values": inputs["input_values"].squeeze(0),
            "labels": torch.tensor(entry["mismatch_label"], dtype=torch.long),
        }
        return item


def compute_metrics(eval_pred):
    from sklearn.metrics import accuracy_score, f1_score

    logits, labels = eval_pred
    preds = np.argmax(logits, axis=1)
    return {
        "accuracy": accuracy_score(labels, preds),
        "f1": f1_score(labels, preds),
    }


def main(args):
    with open(args.manifest_path, "r") as f:
        manifest = json.load(f)

    # reuse the same split logic as the baseline for a fair comparison
    import sys
    sys.path.append(os.path.join(os.path.dirname(__file__)))
    from dataset import split_manifest

    train_entries, val_entries, test_entries = split_manifest(manifest)

    feature_extractor = ASTFeatureExtractor.from_pretrained(MODEL_CHECKPOINT)

    train_ds = ASTDataset(train_entries, feature_extractor)
    val_ds = ASTDataset(val_entries, feature_extractor)

    model = ASTForAudioClassification.from_pretrained(
        MODEL_CHECKPOINT,
        num_labels=2,
        ignore_mismatched_sizes=True,  # replacing the classification head
    )

    training_args = TrainingArguments(
        output_dir="results/ast_checkpoints",
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=args.lr,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        logging_dir="results/ast_logs",
        logging_steps=10,
        save_total_limit=2,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        compute_metrics=compute_metrics,
    )

    trainer.train()

    # Save the final fine-tuned model + feature extractor for handoff
    os.makedirs("results/ast_final_model", exist_ok=True)
    trainer.save_model("results/ast_final_model")
    feature_extractor.save_pretrained("results/ast_final_model")

    print("AST fine-tuning complete. Model saved to results/ast_final_model")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest_path", default="data/augmented/manifest.json")
    parser.add_argument("--batch_size", type=int, default=8)
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--lr", type=float, default=5e-5)
    args = parser.parse_args()

    main(args)
