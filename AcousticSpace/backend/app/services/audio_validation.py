"""
Audio Validation Service

Validates audio files before processing:
- File existence
- File format
- Sample rate
- Duration
- Non-empty audio
"""

import os
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import soundfile as sf

from app.core.config import settings
from app.core.logger import log_error, log_info, log_warning


class AudioValidationError(Exception):
    """Raised when audio validation fails."""
    pass


def validate_audio_file(file_path: str, content_type: str | None = None) -> Tuple[bool, Dict]:
    """
    Validate an audio file before processing.
    
    Parameters
    ----------
    file_path : str
        Path to the audio file.
    content_type : str, optional
        MIME type reported by the client/browser.
    
    Returns
    -------
    Tuple[bool, Dict]
        (is_valid, validation_info)
    """
    validation_info = {
        "file_exists": False,
        "file_readable": False,
        "format_valid": False,
        "sample_rate_valid": False,
        "duration_valid": False,
        "audio_not_empty": False,
        "file_size_bytes": 0,
        "format": None,
        "sample_rate": None,
        "duration": None,
        "channels": None,
    }
    
    # Check file existence
    if not os.path.exists(file_path):
        validation_info["error"] = f"File does not exist: {file_path}"
        return False, validation_info
    
    validation_info["file_exists"] = True
    
    # Check file is readable
    if not os.access(file_path, os.R_OK):
        validation_info["error"] = f"File is not readable: {file_path}"
        return False, validation_info
    
    validation_info["file_readable"] = True
    
    # Check file size
    file_size = os.path.getsize(file_path)
    validation_info["file_size_bytes"] = file_size
    
    if file_size == 0:
        validation_info["error"] = "Audio file is empty (0 bytes)"
        return False, validation_info
    
    # Check file extension (keep the dot for consistency with config)
    file_ext = Path(file_path).suffix.lower()
    allowed_extensions = [ext.strip().lower() for ext in settings.ALLOWED_EXTENSIONS.split(',')]
    
    # Normalize allowed extensions to include dot
    allowed_extensions_normalized = []
    for ext in allowed_extensions:
        if not ext.startswith('.'):
            ext = f'.{ext}'
        allowed_extensions_normalized.append(ext)
    
    if file_ext not in allowed_extensions_normalized:
        # Enhanced error logging
        log_error(
            f"Unsupported audio format validation failed:\n"
            f"  Filename: {Path(file_path).name}\n"
            f"  Extension: {file_ext}\n"
            f"  Suffix: {Path(file_path).suffix}\n"
            f"  Content-Type: {content_type}\n"
            f"  Allowed extensions: {allowed_extensions_normalized}"
        )
        validation_info["error"] = f"Unsupported audio format: {file_ext}. Allowed: {', '.join(allowed_extensions_normalized)}"
        return False, validation_info
    
    validation_info["format_valid"] = True
    validation_info["format"] = file_ext
    
    # Try to read audio file
    try:
        audio_data, sample_rate = sf.read(file_path)
        
        # Check sample rate (accept common sample rates: 16kHz, 22.05kHz, 44.1kHz, 48kHz)
        valid_sample_rates = [16000, 22050, 44100, 48000]
        validation_info["sample_rate"] = sample_rate
        validation_info["sample_rate_valid"] = sample_rate in valid_sample_rates
        
        if not validation_info["sample_rate_valid"]:
            validation_info["error"] = f"Unsupported sample rate: {sample_rate}Hz. Recommended: 16000, 22050, 44100, or 48000 Hz"
            return False, validation_info
        
        # Check duration (between 1 second and 5 minutes)
        duration = len(audio_data) / sample_rate
        validation_info["duration"] = duration
        validation_info["duration_valid"] = 1.0 <= duration <= 300.0
        
        if duration < 1.0:
            validation_info["error"] = f"Audio too short: {duration:.2f}s. Minimum: 1.0s"
            return False, validation_info
        
        if duration > 300.0:
            validation_info["error"] = f"Audio too long: {duration:.2f}s. Maximum: 300.0s (5 minutes)"
            return False, validation_info
        
        # Check audio is not empty (has non-zero samples)
        validation_info["audio_not_empty"] = np.any(audio_data != 0)
        
        if not validation_info["audio_not_empty"]:
            validation_info["error"] = "Audio file contains only silence (all zeros)"
            return False, validation_info
        
        # Check channels
        if len(audio_data.shape) > 1:
            validation_info["channels"] = audio_data.shape[1]
        else:
            validation_info["channels"] = 1
        
        log_info(
            f"✓ Audio validation passed: format={file_ext}, "
            f"sample_rate={sample_rate}Hz, duration={duration:.2f}s, "
            f"channels={validation_info['channels']}"
        )
        
        return True, validation_info
    
    except Exception as e:
        validation_info["error"] = f"Failed to read audio file: {str(e)}"
        log_error(f"Audio validation failed: {validation_info['error']}")
        return False, validation_info


def validate_audio_duration(file_path: str, min_duration: float = 1.0, max_duration: float = 300.0) -> Tuple[bool, float]:
    """
    Validate audio file duration.
    
    Parameters
    ----------
    file_path : str
        Path to the audio file.
    min_duration : float, optional
        Minimum duration in seconds. Default is 1.0.
    max_duration : float, optional
        Maximum duration in seconds. Default is 300.0.
    
    Returns
    -------
    Tuple[bool, float]
        (is_valid, duration)
    """
    try:
        audio_data, sample_rate = sf.read(file_path)
        duration = len(audio_data) / sample_rate
        
        if duration < min_duration:
            return False, duration
        
        if duration > max_duration:
            return False, duration
        
        return True, duration
    
    except Exception as e:
        raise AudioValidationError(f"Failed to validate audio duration: {str(e)}")


def validate_audio_format(file_path: str, content_type: str | None = None) -> Tuple[bool, str]:
    """
    Validate audio file format.
    
    Parameters
    ----------
    file_path : str
        Path to the audio file.
    content_type : str, optional
        MIME type reported by the client/browser.
    
    Returns
    -------
    Tuple[bool, str]
        (is_valid, format_or_error)
    """
    file_ext = Path(file_path).suffix.lower()
    allowed_extensions = [ext.strip().lower() for ext in settings.ALLOWED_EXTENSIONS.split(',')]
    
    # Normalize allowed extensions to include dot
    allowed_extensions_normalized = []
    for ext in allowed_extensions:
        if not ext.startswith('.'):
            ext = f'.{ext}'
        allowed_extensions_normalized.append(ext)
    
    if file_ext not in allowed_extensions_normalized:
        # Enhanced error logging
        log_error(
            f"Unsupported audio format validation failed:\n"
            f"  Filename: {Path(file_path).name}\n"
            f"  Extension: {file_ext}\n"
            f"  Suffix: {Path(file_path).suffix}\n"
            f"  Content-Type: {content_type}\n"
            f"  Allowed extensions: {allowed_extensions_normalized}"
        )
        return False, f"Unsupported format: {file_ext}. Allowed: {', '.join(allowed_extensions_normalized)}"
    
    return True, file_ext


def get_audio_info(file_path: str) -> Dict:
    """
    Get detailed information about an audio file.
    
    Parameters
    ----------
    file_path : str
        Path to the audio file.
    
    Returns
    -------
    Dict
        Audio file information.
    """
    try:
        audio_data, sample_rate = sf.read(file_path)
        
        return {
            "file_path": file_path,
            "file_size_bytes": os.path.getsize(file_path),
            "format": Path(file_path).suffix.lower(),
            "sample_rate": sample_rate,
            "duration": len(audio_data) / sample_rate,
            "channels": audio_data.shape[1] if len(audio_data.shape) > 1 else 1,
            "samples": len(audio_data),
            "min_value": float(np.min(audio_data)),
            "max_value": float(np.max(audio_data)),
            "rms": float(np.sqrt(np.mean(audio_data ** 2))),
        }
    
    except Exception as e:
        return {
            "file_path": file_path,
            "error": str(e)
        }
