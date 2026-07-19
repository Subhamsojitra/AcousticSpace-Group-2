"""
cnn_baseline.py
Simple CNN baseline classifier over spectrogram features.
Used as a comparison point before fine-tuning AST (Week 2 -> Week 3).
"""

import torch
import torch.nn as nn


class CNNBaseline(nn.Module):
    def __init__(self, num_classes=2):
        super().__init__()
        self.conv_block = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(2),  # -> (16, n_mels/2, time/2)

            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),  # -> (32, n_mels/4, time/4)

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((4, 4)),  # -> (64, 4, 4) regardless of input size
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 4 * 4, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        x = self.conv_block(x)
        x = self.classifier(x)
        return x


if __name__ == "__main__":
    model = CNNBaseline()
    dummy_input = torch.randn(4, 1, 128, 400)  # batch=4, channel=1, n_mels=128, time=400
    output = model(dummy_input)
    print(f"Output shape: {output.shape}")  # expected: (4, 2)
