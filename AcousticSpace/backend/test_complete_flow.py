#!/usr/bin/env python3
"""
Test script to verify the complete AST model loading and inference flow.
Tests the entire sequence from startup to prediction.
"""

import sys
import time
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.ml.model_loader import get_model_loader, ModelLoadError
from app.core.logger import logger

def test_model_path():
    """Test 1: Verify AST model path configuration."""
    print("=" * 60)
    print("TEST 1: AST Model Path Configuration")
    print("=" * 60)
    
    print(f"AST_MODEL_PATH: {settings.AST_MODEL_PATH}")
    
    model_path = Path(settings.AST_MODEL_PATH)
    print(f"Path exists: {model_path.exists()}")
    print(f"Path is directory: {model_path.is_dir()}")
    
    if model_path.exists() and model_path.is_dir():
        files = list(model_path.iterdir())
        print(f"Files in directory: {[f.name for f in files]}")
        
        required_files = ['config.json', 'model.safetensors', 'preprocessor_config.json']
        all_exist = all((model_path / f).exists() for f in required_files)
        print(f"All required files exist: {all_exist}")
        
        for f in required_files:
            exists = (model_path / f).exists()
            status = "✓" if exists else "✗"
            print(f"  {status} {f}")
        
        return all_exist
    else:
        print("✗ Model path does not exist or is not a directory!")
        return False

def test_model_loader():
    """Test 2: Test model loader functionality."""
    print("\n" + "=" * 60)
    print("TEST 2: Model Loader")
    print("=" * 60)
    
    try:
        # Get model loader instance
        model_loader = get_model_loader()
        print(f"✓ Model loader instance created")
        print(f"  Model loaded: {model_loader.is_loaded()}")
        print(f"  Device: {model_loader.get_device()}")
        
        # Test loading model
        print("\nLoading model...")
        start = time.perf_counter()
        success, message = model_loader.load_model()
        load_time = time.perf_counter() - start
        
        print(f"  Load success: {success}")
        print(f"  Message: {message}")
        print(f"  Load time: {load_time:.2f}s")
        
        if success:
            print(f"  Model loaded: {model_loader.is_loaded()}")
            print(f"  Device: {model_loader.get_device()}")
            print(f"  Load time (from loader): {model_loader.get_load_time():.2f}s")
            
            # Get model info
            info = model_loader.get_model_info()
            print(f"\nModel Info:")
            print(f"  Loaded: {info['loaded']}")
            print(f"  Device: {info['device']}")
            print(f"  Model path: {info['model_path']}")
            print(f"  Load time: {info['load_time_seconds']:.2f}s")
            print(f"  Total parameters: {info['total_parameters']:,}")
            
            return True
        else:
            print("✗ Model loading failed")
            return False
            
    except ModelLoadError as e:
        print(f"✗ ModelLoadError: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_prediction():
    """Test 3: Test prediction with loaded model."""
    print("\n" + "=" * 60)
    print("TEST 3: Prediction")
    print("=" * 60)
    
    try:
        from app.ml.model_loader import get_model_loader
        import librosa
        import numpy as np
        
        model_loader = get_model_loader()
        
        if not model_loader.is_loaded():
            print("✗ Model not loaded, cannot test prediction")
            return False
        
        # Create a dummy audio file for testing
        test_audio_path = backend_dir / "test_prediction.wav"
        print(f"Creating test audio file: {test_audio_path}")
        
        # Generate 2 seconds of test audio
        sample_rate = 16000
        duration = 2.0
        t = np.linspace(0, duration, int(sample_rate * duration))
        # Create a simple sine wave with some variation
        audio = 0.5 * np.sin(2 * np.pi * 440 * t) + 0.3 * np.sin(2 * np.pi * 880 * t)
        
        import soundfile as sf
        sf.write(str(test_audio_path), audio, sample_rate)
        print(f"✓ Test audio created: {test_audio_path}")
        
        # Load model components
        model = model_loader.get_model()
        feature_extractor = model_loader.get_feature_extractor()
        device = model_loader.get_device()
        
        print(f"Model: {model is not None}")
        print(f"Feature extractor: {feature_extractor is not None}")
        print(f"Device: {device}")
        
        # Load audio for AST
        audio_for_ast, _ = librosa.load(str(test_audio_path), sr=16000, mono=True)
        print(f"Audio loaded: {len(audio_for_ast)} samples")
        
        # Prepare inputs
        inputs = feature_extractor(
            audio_for_ast,
            sampling_rate=16000,
            return_tensors="pt"
        )
        input_values = inputs["input_values"].to(device)
        print(f"Input shape: {input_values.shape}")
        
        # Run inference
        import torch
        with torch.no_grad():
            outputs = model(input_values)
            probs = torch.softmax(outputs.logits, dim=1)[0]
            confidence_score = probs[1].item()
            prediction = "Fake" if confidence_score > 0.5 else "Real"
            confidence = round(confidence_score * 100, 2)
        
        print(f"✓ Prediction completed:")
        print(f"  Prediction: {prediction}")
        print(f"  Confidence: {confidence}%")
        print(f"  Raw score: {confidence_score:.4f}")
        
        # Clean up
        test_audio_path.unlink()
        print(f"✓ Test audio cleaned up")
        
        return True
        
    except Exception as e:
        print(f"✗ Prediction test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("COMPLETE FLOW TEST - AST MODEL LOADING AND INFERENCE")
    print("=" * 60 + "\n")
    
    results = []
    
    # Test 1: Model path
    results.append(("Model Path Configuration", test_model_path()))
    
    # Test 2: Model loader
    results.append(("Model Loader", test_model_loader()))
    
    # Test 3: Prediction
    results.append(("Prediction", test_prediction()))
    
    # Summary
    print("\n" + "=" * 60)
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
        print("\nThe AST model loading and inference pipeline is working correctly!")
        return 0
    else:
        print("✗ SOME TESTS FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())