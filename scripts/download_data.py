"""
download_data.py
Downloads and organizes the RIR dataset. ASVspoof should be attached
directly in Kaggle via 'Add Input' (search: awsaf49/asvpoof-2019-dataset).

Run this INSIDE a Kaggle notebook or any machine with internet access.
"""

import os
import subprocess
import zipfile

RIR_URL = "https://www.openslr.org/resources/28/rirs_noises.zip"
DATA_DIR = "data"
RIR_ZIP_PATH = os.path.join(DATA_DIR, "rirs_noises.zip")
RIR_EXTRACT_PATH = os.path.join(DATA_DIR, "rirs_noises")


def download_rir_dataset():
    os.makedirs(DATA_DIR, exist_ok=True)

    if os.path.exists(RIR_EXTRACT_PATH):
        print(f"RIR dataset already extracted at {RIR_EXTRACT_PATH}, skipping.")
        return

    print("Downloading RIR + Noise dataset from OpenSLR (SLR28)...")
    subprocess.run(["wget", "-O", RIR_ZIP_PATH, RIR_URL], check=True)

    print("Extracting...")
    with zipfile.ZipFile(RIR_ZIP_PATH, "r") as zip_ref:
        zip_ref.extractall(RIR_EXTRACT_PATH)

    print(f"Done. RIR files extracted to: {RIR_EXTRACT_PATH}")


def check_asvspoof_present():
    """
    In Kaggle, attached datasets typically appear under /kaggle/input/.
    Adjust this path check if running locally with a manual download.
    """
    possible_paths = [
        "/kaggle/input/asvpoof-2019-dataset",
        "data/asvspoof2019",
    ]
    for path in possible_paths:
        if os.path.exists(path):
            print(f"ASVspoof dataset found at: {path}")
            return path

    print(
        "WARNING: ASVspoof dataset not found. "
        "In Kaggle, attach it via 'Add Input' -> search 'awsaf49/asvpoof-2019-dataset'. "
        "If running locally, download from https://www.kaggle.com/datasets/awsaf49/asvpoof-2019-dataset "
        "and place it under data/asvspoof2019."
    )
    return None


if __name__ == "__main__":
    download_rir_dataset()
    check_asvspoof_present()
