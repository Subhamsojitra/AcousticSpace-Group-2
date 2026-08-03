"""
Production-Ready Model Loader

Features:
- Singleton pattern (thread-safe)
- Lazy loading
- Hardware detection (CUDA/MPS/CPU)
- Graceful failure handling
- Structured logging
- Memory-efficient loading
"""

import logging
import time
from pathlib import Path
from typing import Optional, Tuple

import torch
from transformers import ASTForAudioClassification, ASTFeatureExtractor

from app.core.config import settings
from app.core.logger import log_error, log_info, log_warning

logger = logging.getLogger("AcousticSpace.model_loader")


class ModelLoadError(Exception):
    """Raised when model loading fails."""
    pass


class ModelLoader:
    """
    Thread-safe singleton model loader for AST model.
    
    This class ensures:
    - Model loads only once
    - Thread-safe initialization
    - Proper error handling
    - Hardware detection
    - Resource cleanup
    """
    
    _instance: Optional['ModelLoader'] = None
    _lock: Optional[torch.multiprocessing.Lock] = None
    
    def __new__(cls) -> 'ModelLoader':
        """Thread-safe singleton initialization."""
        if cls._instance is None:
            if cls._lock is None:
                if torch.multiprocessing.get_start_method() == 'spawn':
                    cls._lock = torch.multiprocessing.Lock()
                else:
                    import threading
                    cls._lock = threading.Lock()
            
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize model loader (only runs once)."""
        if self._initialized:
            return
        
        self._model = None
        self._feature_extractor = None
        self._device = None
        self._model_path = None
        self._load_time = None
        self._initialized = True
    
    def detect_device(self) -> torch.device:
        """
        Detect the best available device (CUDA > MPS > CPU).
        
        Returns
        -------
        torch.device
            The best available device for inference.
        """
        if torch.cuda.is_available():
            device = torch.device("cuda")
            device_name = torch.cuda.get_device_name(0)
            log_info(f"✓ CUDA detected: {device_name}")
            return device
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            device = torch.device("mps")
            log_info("✓ MPS (Apple Silicon) detected")
            return device
        else:
            device = torch.device("cpu")
            log_info("✓ Using CPU (no GPU detected)")
            return device
    
    def validate_model_files(self, model_path: Path) -> Tuple[bool, str]:
        """
        Validate that all required model files exist and are readable.
        
        Parameters
        ----------
        model_path : Path
            Path to the model directory.
        
        Returns
        -------
        Tuple[bool, str]
            (is_valid, error_message)
        """
        required_files = {
            'config.json': 'Model configuration',
            'model.safetensors': 'Model weights',
            'preprocessor_config.json': 'Preprocessor configuration'
        }
        
        if not model_path.exists():
            return False, f"Model directory does not exist: {model_path}"
        
        if not model_path.is_dir():
            return False, f"Model path is not a directory: {model_path}"
        
        missing_files = []
        for filename, description in required_files.items():
            file_path = model_path / filename
            if not file_path.exists():
                missing_files.append(f"{description} ({filename})")
            elif not file_path.is_file():
                missing_files.append(f"{description} ({filename}) is not a file")
            else:
                # Check if file is readable
                try:
                    with open(file_path, 'rb') as f:
                        f.read(1)
                except Exception as e:
                    missing_files.append(f"{description} ({filename}) is not readable: {e}")
        
        if missing_files:
            return False, f"Missing or invalid model files: {', '.join(missing_files)}"
        
        return True, "All model files validated successfully"
    
    def load_model(self, force_reload: bool = False) -> Tuple[bool, str]:
        """
        Load the AST model and feature extractor.
        
        Parameters
        ----------
        force_reload : bool, optional
            If True, reload model even if already loaded. Default is False.
        
        Returns
        -------
        Tuple[bool, str]
            (success, message)
        """
        # Return cached model if already loaded
        if self._model is not None and not force_reload:
            return True, f"Model already loaded on {self._device}"
        
        load_start = time.perf_counter()
        log_info("=" * 60)
        log_info("Loading AST model...")
        log_info("=" * 60)
        log_info(f"Model path: {settings.AST_MODEL_PATH}")
        
        try:
            # Get model path
            model_path = Path(settings.AST_MODEL_PATH)
            self._model_path = model_path
            
            log_info(f"Model path: {model_path}")
            
            # Validate model files
            is_valid, validation_msg = self.validate_model_files(model_path)
            if not is_valid:
                raise ModelLoadError(validation_msg)
            
            log_info(f"✓ Model files validated: {validation_msg}")
            
            # Detect hardware
            self._device = self.detect_device()
            log_info(f"Device: {self._device}")
            
            # Load model
            log_info("Loading model weights...")
            t0 = time.perf_counter()
            
            self._model = ASTForAudioClassification.from_pretrained(
                str(model_path),
                local_files_only=True  # Use only local files, don't download
            )
            self._model.to(self._device)
            self._model.eval()  # Set to evaluation mode
            
            t_load = time.perf_counter() - t0
            log_info(f"✓ Model weights loaded in {t_load:.2f}s")
            
            # Load feature extractor
            log_info("Loading feature extractor...")
            t0 = time.perf_counter()
            
            self._feature_extractor = ASTFeatureExtractor.from_pretrained(
                str(model_path),
                local_files_only=True
            )
            
            t_load = time.perf_counter() - t0
            log_info(f"✓ Feature extractor loaded in {t_load:.2f}s")
            
            # Calculate total load time
            self._load_time = time.perf_counter() - load_start
            
            # Log model info
            total_params = sum(p.numel() for p in self._model.parameters())
            trainable_params = sum(p.numel() for p in self._model.parameters() if p.requires_grad)
            
            log_info("=" * 60)
            log_info(f"✓ Model loaded successfully!")
            log_info(f"  Device: {self._device}")
            log_info(f"  Total parameters: {total_params:,}")
            log_info(f"  Trainable parameters: {trainable_params:,}")
            log_info(f"  Load time: {self._load_time:.2f}s")
            log_info("=" * 60)
            
            return True, f"Model loaded successfully on {self._device} in {self._load_time:.2f}s"
        
        except ModelLoadError:
            raise
        except Exception as e:
            error_msg = f"Failed to load model: {str(e)}"
            log_error(error_msg)
            self._cleanup()
            raise ModelLoadError(error_msg)
    
    def _cleanup(self):
        """Clean up model resources."""
        if self._model is not None:
            del self._model
            self._model = None
        
        if self._feature_extractor is not None:
            del self._feature_extractor
            self._feature_extractor = None
        
        # Clear CUDA cache if using GPU
        if self._device and self._device.type == 'cuda':
            torch.cuda.empty_cache()
    
    def get_model(self) -> Optional[ASTForAudioClassification]:
        """
        Get the loaded model.
        
        Returns
        -------
        Optional[ASTForAudioClassification]
            The loaded model, or None if not loaded.
        """
        return self._model
    
    def get_feature_extractor(self) -> Optional[ASTFeatureExtractor]:
        """
        Get the loaded feature extractor.
        
        Returns
        -------
        Optional[ASTFeatureExtractor]
            The loaded feature extractor, or None if not loaded.
        """
        return self._feature_extractor
    
    def get_device(self) -> Optional[torch.device]:
        """
        Get the device the model is loaded on.
        
        Returns
        -------
        Optional[torch.device]
            The device, or None if model not loaded.
        """
        return self._device
    
    def is_loaded(self) -> bool:
        """
        Check if model is loaded.
        
        Returns
        -------
        bool
            True if model is loaded, False otherwise.
        """
        return self._model is not None and self._feature_extractor is not None
    
    def get_load_time(self) -> Optional[float]:
        """
        Get the time taken to load the model.
        
        Returns
        -------
        Optional[float]
            Load time in seconds, or None if not loaded.
        """
        return self._load_time
    
    def get_model_info(self) -> dict:
        """
        Get information about the loaded model.
        
        Returns
        -------
        dict
            Model information including device, load time, etc.
        """
        return {
            "loaded": self.is_loaded(),
            "device": str(self._device) if self._device else None,
            "model_path": str(self._model_path) if self._model_path else None,
            "load_time_seconds": self._load_time,
            "total_parameters": sum(p.numel() for p in self._model.parameters()) if self._model else 0,
        }
    
    def unload_model(self):
        """Unload the model from memory."""
        log_info("Unloading model...")
        self._cleanup()
        log_info("✓ Model unloaded")


# Global model loader instance
_model_loader: Optional[ModelLoader] = None


def get_model_loader() -> ModelLoader:
    """
    Get the global model loader instance.
    
    Returns
    -------
    ModelLoader
        The singleton model loader instance.
    """
    global _model_loader
    if _model_loader is None:
        _model_loader = ModelLoader()
    return _model_loader