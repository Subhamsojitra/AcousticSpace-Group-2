import { useState, useCallback } from 'react';
import { validateAudioFile } from '../utils/fileValidation';

/**
 * Custom React hook for managing file uploads.
 * Handles validation, preview metadata, and cleanup of audio files.
 */
export const useFileUpload = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = useCallback((selectedFile) => {
    if (!selectedFile) return;

    const validation = validateAudioFile(selectedFile);
    if (validation.isValid) {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError(validation.error);
    }
  }, []);

  const removeFile = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  return {
    file,
    error,
    handleFileChange,
    removeFile,
  };
};
