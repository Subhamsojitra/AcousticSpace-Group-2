"""
analyze_any_file.py
Accepts ANY audio or video file, extracts/converts audio if needed (using
ffmpeg for video containers), then runs the full AcousticSpace analysis
pipeline (AST model + breathing detection + acoustic features).
"""

import os
import sys
import subprocess
import tempfile
import argparse

sys.path.append(os.path.dirname(__file__))
from AcousticSpace.scripts.analyze import analyze

VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".wmv"}
AUDIO_EXTENSIONS = {".wav", ".flac", ".mp3", ".ogg", ".m4a", ".aac"}


def check_ffmpeg_available():
    try:
        subprocess.run(
            ["ffmpeg", "-version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True,
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def extract_audio_from_video(video_path, output_wav_path):
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        output_wav_path,
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed to extract audio from {video_path}:\n"
            f"{result.stderr.decode(errors='ignore')}"
        )


def analyze_any_file(input_path):
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"File not found: {input_path}")

    ext = os.path.splitext(input_path)[1].lower()

    if ext in VIDEO_EXTENSIONS:
        if not check_ffmpeg_available():
            raise RuntimeError(
                "This is a video file and needs ffmpeg to extract audio, "
                "but ffmpeg was not found on this system. Install it from "
                "https://ffmpeg.org/download.html (on Windows: winget install ffmpeg, "
                "then restart your terminal)."
            )

        print(f"Video file detected ({ext}) - extracting audio with ffmpeg...")
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_wav_path = tmp.name

        try:
            extract_audio_from_video(input_path, tmp_wav_path)
            result = analyze(tmp_wav_path)
        finally:
            if os.path.exists(tmp_wav_path):
                os.remove(tmp_wav_path)

        return result

    elif ext in AUDIO_EXTENSIONS:
        return analyze(input_path)

    else:
        raise ValueError(
            f"Unrecognized file extension '{ext}'. "
            f"Supported audio: {sorted(AUDIO_EXTENSIONS)}. "
            f"Supported video: {sorted(VIDEO_EXTENSIONS)}."
        )


if __name__ == "__main__":
    import json

    parser = argparse.ArgumentParser(
        description="Analyze any audio or video file for deepfake acoustic mismatch."
    )
    parser.add_argument("--file", required=True, help="Path to the audio or video file to analyze")
    args = parser.parse_args()

    result = analyze_any_file(args.file)
    print("\n" + "=" * 50)
    print(json.dumps(result, indent=2))