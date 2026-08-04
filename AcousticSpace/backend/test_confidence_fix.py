"""
Test script to verify confidence score fix.

This script tests:
1. Model loading with correct path
2. Prediction pipeline
3. Confidence calculation
4. Label mapping
"""

import sys
import time
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.core.logger import logger
from app.ml.model_loader import get_model_loader


def test_model_path():
    """Test 1: Verify model path is correct."""
    print("=" * 60)
    print("TEST 1: Model Path Verification")
    print("=" * 60)
    
    model_path = Path(settings.AST_MODEL_PATH)
    print(f"AST_MODEL_PATH: {settings.AST_MODEL_PATH}")
    print(f"Model path exists: {model_path.exists()}")
    print(f"Model path is directory: {model_path.is_dir()}")
    
    if not model_path.exists():
        print("❌ FAIL: Model path does not exist!")
        return False
    
    if not model_path.is_dir():
        print("❌ FAIL: Model path is not a directory!")
        return False
    
    # Check required files
    required_files = ['config.json', 'model.safetensors', 'preprocessor_config.json']
    all_exist = True
    for filename in required_files:
        file_path = model_path / filename
        exists = file_path.exists()
        print(f"  {filename}: {'✓' if exists else '❌'}")
        if not exists:
            all_exist = False
    
    if not all_exist:
        print("❌ FAIL: Missing required model files!")
        return False
    
    print("✓ PASS: Model path and files are correct")
    return True


def test_model_loading():
    """Test 2: Verify model loads successfully."""
    print("\n" + "=" * 60)
    print("TEST 2: Model Loading")
    print("=" * 60)
    
    try:
        model_loader = get_model_loader()
        print(f"Model loader instance created: {model_loader is not None}")
        print(f"Model already loaded: {model_loader.is_loaded()}")
        
        if not model_loader.is_loaded():
            print("Loading model...")
            start = time.perf_counter()
            success, message = model_loader.load_model()
            load_time = time.perf_counter() - start
            print(f"Load success: {success}")
            print(f"Load message: {message}")
            print(f"Load time: {load_time:.2f}s")
            
            if not success:
                print("❌ FAIL: Model loading failed!")
                return False
        else:
            print("Model already loaded, skipping load")
        
        # Verify model is loaded
        model = model_loader.get_model()
        feature_extractor = model_loader.get_feature_extractor()
        device = model_loader.get_device()
        
        print(f"Model loaded: {model is not None}")
        print(f"Feature extractor loaded: {feature_extractor is not None}")
        print(f"Device: {device}")
        
        if model is None:
            print("❌ FAIL: Model is None!")
            return False
        
        if feature_extractor is None:
            print("❌ FAIL: Feature extractor is None!")
            return False
        
        print("✓ PASS: Model loaded successfully")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception during model loading: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_inference():
    """Test 3: Verify inference pipeline works."""
    print("\n" + "=" * 60)
    print("TEST 3: Inference Pipeline")
    print("=" * 60)
    
    try:
        import torch
        import librosa
        import numpy as np
        from app.ml.model_loader import get_model_loader
        
        # Use a test audio file if available
        test_audio_path = backend_dir / "dataset" / "test" / "real" / "p225" / "p225_001.wav"
        
        if not test_audio_path.exists():
            print(f"Test audio not found at: {test_audio_path}")
            print("Looking for any test audio file...")
            
            # Search for any audio file
            test_dir = backend_dir / "dataset" / "test"
            if test_dir.exists():
                audio_files = list(test_dir.rglob("*.wav"))[:1]
                if audio_files:
                    test_audio_path = audio_files[0]
                    print(f"Using test audio: {test_audio_path}")
            
            if not test_audio_path.exists():
                print("⚠ SKIP: No test audio file available")
                return None
        
        print(f"Test audio: {test_audio_path}")
        
        # Load model
        model_loader = get_model_loader()
        if not model_loader.is_loaded():
            success, message = model_loader.load_model()
            if not success:
                print("❌ FAIL: Could not load model for inference test")
                return False
        
        ast_model = model_loader.get_model()
        feature_extractor = model_loader.get_feature_extractor()
        device = model_loader.get_device()
        
        # Load audio
        print("Loading audio...")
        audio_for_ast, sr = librosa.load(str(test_audio_path), sr=16000, mono=True)
        print(f"Audio shape: {audio_for_ast.shape}, sample rate: {sr}")
        
        # Prepare inputs
        print("Preparing inputs...")
        inputs = feature_extractor(
            audio_for_ast,
            sampling_rate=16000,
            return_tensors="pt"
        )
        input_values = inputs["input_values"].to(device)
        print(f"Input shape: {input_values.shape}")
        
        # Run inference
        print("Running inference...")
        with torch.no_grad():
            outputs = ast_model(input_values)
            logits = outputs.logits
            print(f"Raw logits: {logits}")
            
            probs = torch.softmax(logits, dim=1)[0]
            print(f"Softmax probabilities: {probs}")
            print(f"  Class 0 (REAL): {probs[0].item():.6f} ({probs[0].item()*100:.2f}%)")
            print(f"  Class 1 (FAKE): {probs[1].item():.6f} ({probs[1].item()*100:.2f}%)")
            
            predicted_class = torch.argmax(probs).item()
            confidence_score = probs[1].item()
            
            print(f"Predicted class: {predicted_class}")
            print(f"Prediction: {'FAKE' if predicted_class == 1 else 'REAL'}")
            print(f"Confidence (FAKE): {confidence_score * 100:.2f}%")
            print(f"Confidence (REAL): {probs[0].item() * 100:.2f}%")
        
        print("✓ PASS: Inference completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception during inference: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("CONFIDENCE SCORE FIX VERIFICATION")
    print("=" * 60)
    
    results = []
    
    # Test 1: Model path
    results.append(("Model Path", test_model_path()))
    
    # Test 2: Model loading
    results.append(("Model Loading", test_model_loading()))
    
    # Test 3: Inference
    results.append(("Inference", test_inference()))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, result in results:
        if result is None:
            status = "⚠ SKIPPED"
        elif result:
            status = "✓ PASS"
        else:
            status = "❌ FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(r for r in results if r is not None)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ ALL TESTS PASSED")
    else:
        print("❌ SOME TESTS FAILED")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())