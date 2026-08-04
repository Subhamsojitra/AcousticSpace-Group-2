#!/usr/bin/env python3
"""
Test script to verify the audio validation fix.
Tests all allowed audio formats including MP3.
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.services.audio_validation import validate_audio_file, validate_audio_format
from app.services.validation import allowed_extension
from app.core.config import settings

def test_extension_normalization():
    """Test that extensions are normalized correctly."""
    print("=" * 60)
    print("TEST 1: Extension Normalization")
    print("=" * 60)
    
    test_cases = [
        ("test.mp3", True),
        ("test.MP3", True),
        ("test.Mp3", True),
        ("test.wav", True),
        ("test.WAV", True),
        ("test.flac", True),
        ("test.FLAC", True),
        ("test.ogg", True),
        ("test.m4a", True),
        ("test.txt", False),
        ("test.mp4", False),
    ]
    
    all_passed = True
    for filename, expected in test_cases:
        result = allowed_extension(filename)
        status = "✓" if result == expected else "✗"
        print(f"{status} {filename:20s} -> {result} (expected {expected})")
        if result != expected:
            all_passed = False
    
    print()
    return all_passed

def test_double_extension():
    """Test handling of double extensions like .mp3.mp3"""
    print("=" * 60)
    print("TEST 2: Double Extension Handling")
    print("=" * 60)
    
    test_cases = [
        ("test sound 1.mp3.mp3", True),  # Should detect .mp3
        ("test.mp3.txt", False),
        ("test.wav.wav", True),
    ]
    
    all_passed = True
    for filename, expected in test_cases:
        result = allowed_extension(filename)
        ext = Path(filename).suffix.lower()
        status = "✓" if result == expected else "✗"
        print(f"{status} {filename:30s} -> ext={ext:10s} allowed={result} (expected {expected})")
        if result != expected:
            all_passed = False
    
    print()
    return all_passed

def test_config_consistency():
    """Test that config extensions are consistent."""
    print("=" * 60)
    print("TEST 3: Config Consistency")
    print("=" * 60)
    
    print(f"ALLOWED_EXTENSIONS config: {settings.ALLOWED_EXTENSIONS}")
    
    extensions = [ext.strip() for ext in settings.ALLOWED_EXTENSIONS.split(',')]
    print(f"Parsed extensions: {extensions}")
    
    # Test each extension
    all_passed = True
    for ext in extensions:
        test_file = f"test{ext}"
        result = allowed_extension(test_file)
        status = "✓" if result else "✗"
        print(f"{status} {test_file:20s} -> {result}")
        if not result:
            all_passed = False
    
    print()
    return all_passed

def test_validation_functions():
    """Test the validation functions directly."""
    print("=" * 60)
    print("TEST 4: Validation Functions")
    print("=" * 60)
    
    # Create a dummy file for testing
    test_file = backend_dir / "test_audio.mp3"
    
    # Create a minimal valid WAV file for testing
    import wave
    import struct
    
    try:
        with wave.open(str(test_file), 'w') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(44100)
            # Write 2 seconds of non-silent audio (varying amplitude)
            data = b''.join(struct.pack('h', int(32767 * 0.5 * (1 + 0.5 * (i % 100) / 100))) for i in range(88200))
            wav_file.writeframes(data)
        
        # Rename to .mp3 for testing
        mp3_file = backend_dir / "test_audio_renamed.mp3"
        test_file.rename(mp3_file)
        
        # Test validate_audio_format
        is_valid, format_or_error = validate_audio_format(str(mp3_file))
        print(f"validate_audio_format('{mp3_file.name}'): {is_valid}, {format_or_error}")
        
        # Test validate_audio_file
        is_valid, info = validate_audio_file(str(mp3_file))
        print(f"validate_audio_file('{mp3_file.name}'): {is_valid}")
        if not is_valid:
            print(f"  Error: {info.get('error')}")
        
        # Clean up
        mp3_file.unlink()
        
        return is_valid
        
    except Exception as e:
        print(f"✗ Test failed with exception: {e}")
        return False

def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("AUDIO VALIDATION FIX - TEST SUITE")
    print("=" * 60 + "\n")
    
    results = []
    
    results.append(("Extension Normalization", test_extension_normalization()))
    results.append(("Double Extension Handling", test_double_extension()))
    results.append(("Config Consistency", test_config_consistency()))
    results.append(("Validation Functions", test_validation_functions()))
    
    print("=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for test_name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{status}: {test_name}")
        if not passed:
            all_passed = False
    
    print("=" * 60)
    if all_passed:
        print("✓ ALL TESTS PASSED")
        return 0
    else:
        print("✗ SOME TESTS FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())