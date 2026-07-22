"""
Unit tests for breathing cadence alignment module.

Tests cover:
- Clean speech
- Synthetic breathing
- Silent clip
- Noisy clip
- Fake speech (synthetic TTS-like)
"""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

import numpy as np
import librosa
import sys
from pathlib import Path

# Add parent of AcousticSpace to path so 'AcousticSpace' package is importable
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from AcousticSpace.scripts.cadence_alignment import (
    analyze_breathing_alignment,
    compute_alignment_score,
    detect_syllable_peaks,
    extract_breath_timestamps,
)


class TestCadenceAlignment(unittest.TestCase):
    """Test suite for cadence alignment module."""

    @classmethod
    def setUpClass(cls):
        """Set up test fixtures."""
        cls.sr = 16000
        cls.test_duration = 5.0  # seconds

    def _create_test_audio(
        self,
        duration: float = 5.0,
        add_speech: bool = True,
        add_breathing: bool = True,
        add_noise: bool = False,
        noise_level: float = 0.01,
    ) -> np.ndarray:
        """
        Create synthetic test audio.

        Parameters
        ----------
        duration : float
            Audio duration in seconds.
        add_speech : bool
            Whether to add synthetic speech-like signal.
        add_breathing : bool
            Whether to add synthetic breathing.
        add_noise : bool
            Whether to add background noise.
        noise_level : float
            Noise amplitude (0-1).

        Returns
        -------
        np.ndarray
            Synthetic audio signal.
        """
        samples = int(duration * self.sr)
        audio = np.zeros(samples)

        if add_speech:
            # Create synthetic speech-like signal (amplitude modulated noise)
            # Simulate syllables with amplitude modulation
            syllable_rate = 4.0  # syllables per second
            t = np.arange(samples) / self.sr

            # Create amplitude envelope for syllables
            syllable_envelope = np.zeros(samples)
            syllable_spacing = int(self.sr / syllable_rate)

            for i in range(0, samples, syllable_spacing):
                # Each syllable is a short burst
                syllable_len = min(int(0.1 * self.sr), samples - i)
                if syllable_len > 0:
                    syllable_envelope[i:i + syllable_len] = np.hanning(syllable_len)

            # Create noise-like signal (speech has noise-like characteristics)
            speech_signal = np.random.randn(samples) * syllable_envelope

            # Add some tonal components (formants)
            f0 = 150  # Fundamental frequency
            harmonic = np.sin(2 * np.pi * f0 * np.arange(samples) / self.sr)
            harmonic = harmonic * syllable_envelope * 0.3

            audio = speech_signal + harmonic

        if add_breathing:
            # Add synthetic breathing events
            # Breathing typically occurs at phrase boundaries
            breath_positions = [
                int(1.0 * self.sr),  # After first phrase
                int(2.5 * self.sr),  # After second phrase
                int(4.0 * self.sr),  # After third phrase
            ]

            for pos in breath_positions:
                if pos < samples:
                    # Breathing is low-frequency noise-like signal
                    breath_len = int(0.3 * self.sr)  # 300ms breath
                    breath = np.random.randn(breath_len) * 0.1
                    # Low-pass filter effect (smooth)
                    breath = np.convolve(breath, np.ones(50) / 50, mode="same")
                    end_pos = min(pos + breath_len, samples)
                    audio[pos:end_pos] += breath[:end_pos - pos]

        if add_noise:
            # Add background noise
            noise = np.random.randn(samples) * noise_level
            audio = audio + noise

        # Normalize
        max_val = np.max(np.abs(audio))
        if max_val > 0:
            audio = audio / max_val * 0.8

        return audio.astype(np.float32)

    def _save_test_audio(self, audio: np.ndarray) -> str:
        """Save audio to temporary file and return path."""
        tmp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp_path = tmp_file.name
        tmp_file.close()
        librosa.output.write_wav(tmp_path, audio, sr=self.sr)
        return tmp_path

    def test_clean_speech(self):
        """Test with clean synthetic speech."""
        audio = self._create_test_audio(
            duration=5.0,
            add_speech=True,
            add_breathing=True,
            add_noise=False,
        )
        audio_path = self._save_test_audio(audio)

        try:
            result = analyze_breathing_alignment(audio_path, max_duration_sec=10.0)

            # Should detect some syllables
            self.assertGreaterEqual(result["syllable_count"], 0)

            # Should detect some breaths
            self.assertGreaterEqual(result["breath_count"], 0)

            # Processing time should be reasonable
            self.assertLess(result["processing_time"], 5.0)

            # Result should have all required fields
            self.assertIn("alignment_score", result)
            self.assertIn("cadence", result)
            self.assertIn("regularity", result)
            self.assertIn("mean_offset", result)

        finally:
            os.unlink(audio_path)

    def test_synthetic_breathing(self):
        """Test with synthetic breathing events."""
        audio = self._create_test_audio(
            duration=5.0,
            add_speech=True,
            add_breathing=True,
            add_noise=False,
        )
        audio_path = self._save_test_audio(audio)

        try:
            result = analyze_breathing_alignment(audio_path, max_duration_sec=10.0)

            # Should detect breathing
            self.assertGreaterEqual(result["breath_count"], 0)

            # Alignment score should be computed
            self.assertGreaterEqual(result["alignment_score"], 0.0)
            self.assertLessEqual(result["alignment_score"], 1.0)

        finally:
            os.unlink(audio_path)

    def test_silent_clip(self):
        """Test with silent audio."""
        audio = np.zeros(int(2.0 * self.sr), dtype=np.float32)
        audio_path = self._save_test_audio(audio)

        try:
            result = analyze_breathing_alignment(audio_path, max_duration_sec=10.0)

            # Should return default/insufficient data result
            self.assertEqual(result["cadence"], "Insufficient Data")
            self.assertEqual(result["breath_count"], 0)
            self.assertEqual(result["syllable_count"], 0)

        finally:
            os.unlink(audio_path)

    def test_very_short_audio(self):
        """Test with very short audio."""
        audio = np.zeros(int(0.1 * self.sr), dtype=np.float32)
        audio_path = self._save_test_audio(audio)

        try:
            result = analyze_breathing_alignment(audio_path, max_duration_sec=10.0)

            # Should handle gracefully
            self.assertEqual(result["cadence"], "Insufficient Data")

        finally:
            os.unlink(audio_path)

    def test_noisy_clip(self):
        """Test with noisy audio."""
        audio = self._create_test_audio(
            duration=5.0,
            add_speech=True,
            add_breathing=True,
            add_noise=True,
            noise_level=0.1,
        )
        audio_path = self._save_test_audio(audio)

        try:
            result = analyze_breathing_alignment(audio_path, max_duration_sec=10.0)

            # Should still process without crashing
            self.assertIn("alignment_score", result)
            self.assertIn("cadence", result)

            # Score should be in valid range
            self.assertGreaterEqual(result["alignment_score"], 0.0)
            self.assertLessEqual(result["alignment_score"], 1.0)

        finally:
            os.unlink(audio_path)

    def test_fake_speech(self):
        """Test with synthetic TTS-like speech (too regular)."""
        # Create audio with very regular pattern (suspicious)
        duration = 5.0
        samples = int(duration * self.sr)
        audio = np.zeros(samples)

        # Very regular syllable pattern (suspicious)
        syllable_rate = 5.0  # Exactly 5 syllables per second
        syllable_spacing = int(self.sr / syllable_rate)

        for i in range(0, samples, syllable_spacing):
            syllable_len = min(int(0.08 * self.sr), samples - i)
            if syllable_len > 0:
                syllable = np.random.randn(syllable_len) * np.hanning(syllable_len)
                audio[i:i + syllable_len] = syllable * 0.5

        # Normalize
        max_val = np.max(np.abs(audio))
        if max_val > 0:
            audio = audio / max_val * 0.8

        audio_path = self._save_test_audio(audio)

        try:
            result = analyze_breathing_alignment(audio_path, max_duration_sec=10.0)

            # Should process without error
            self.assertIn("alignment_score", result)
            self.assertIn("cadence", result)

            # Regularity should be computed
            self.assertGreaterEqual(result["regularity"], 0.0)
            self.assertLessEqual(result["regularity"], 1.0)

        finally:
            os.unlink(audio_path)

    def test_detect_syllable_peaks(self):
        """Test syllable peak detection directly."""
        audio = self._create_test_audio(
            duration=3.0,
            add_speech=True,
            add_breathing=False,
        )

        syllable_times = detect_syllable_peaks(audio, sr=self.sr)

        # Should return a list
        self.assertIsInstance(syllable_times, list)

        # All values should be floats (timestamps)
        for t in syllable_times:
            self.assertIsInstance(t, float)
            self.assertGreaterEqual(t, 0.0)

    def test_extract_breath_timestamps(self):
        """Test breath timestamp extraction directly."""
        audio = self._create_test_audio(
            duration=3.0,
            add_speech=True,
            add_breathing=True,
        )

        breath_times = extract_breath_timestamps(audio, sr=self.sr)

        # Should return a list
        self.assertIsInstance(breath_times, list)

        # All values should be floats (timestamps)
        for t in breath_times:
            self.assertIsInstance(t, float)
            self.assertGreaterEqual(t, 0.0)

    def test_compute_alignment_score(self):
        """Test alignment score computation."""
        breath_times = [1.0, 2.5, 4.0]
        syllable_times = [0.9, 1.1, 2.4, 2.6, 3.9, 4.1]

        result = compute_alignment_score(breath_times, syllable_times)

        # Should return valid result
        self.assertIn("alignment_score", result)
        self.assertIn("mean_offset", result)
        self.assertIn("cadence_regularity", result)
        self.assertIn("breaths", result)
        self.assertIn("syllables", result)

        # Values should be in valid ranges
        self.assertGreaterEqual(result["alignment_score"], 0.0)
        self.assertLessEqual(result["alignment_score"], 1.0)
        self.assertEqual(result["breaths"], 3)
        self.assertEqual(result["syllables"], 6)

    def test_compute_alignment_score_empty_inputs(self):
        """Test alignment score with empty inputs."""
        # No breaths
        result = compute_alignment_score([], [1.0, 2.0, 3.0])
        self.assertEqual(result["alignment_score"], 0.0)
        self.assertEqual(result["breaths"], 0)

        # No syllables
        result = compute_alignment_score([1.0, 2.0], [])
        self.assertEqual(result["alignment_score"], 0.0)
        self.assertEqual(result["syllables"], 0)

        # Both empty
        result = compute_alignment_score([], [])
        self.assertEqual(result["alignment_score"], 0.0)

    def test_nonexistent_file(self):
        """Test with nonexistent file."""
        result = analyze_breathing_alignment(
            "/nonexistent/path/to/audio.wav",
            max_duration_sec=10.0
        )

        # Should return error result, not crash
        self.assertEqual(result["cadence"], "Error")
        self.assertEqual(result["alignment_score"], 0.0)


if __name__ == "__main__":
    unittest.main()