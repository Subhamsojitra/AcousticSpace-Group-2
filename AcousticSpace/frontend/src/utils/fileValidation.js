export const ALLOWED_EXTENSIONS = ['.wav', '.mp3', '.flac'];
export const MAX_FILE_SIZE_MB = 15;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Validates whether a file is a supported audio format and does not exceed the size limit.
 * @param {File} file - The file object to validate.
 * @returns {Object} - An object containing `isValid` boolean and `error` message string (or null).
 */
export const validateAudioFile = (file) => {
  if (!file) {
    return { isValid: false, error: 'No file selected.' };
  }

  const fileName = file.name || '';
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return { isValid: false, error: 'File has no extension. Only .wav, .mp3, and .flac are supported.' };
  }

  const extension = fileName.substring(lastDotIndex).toLowerCase();

  // Validate extension
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `Unsupported file type "${extension}". Only .wav, .mp3, and .flac audio files are allowed.`
    };
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds the 15 MB limit. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB.`
    };
  }

  return { isValid: true, error: null };
};

/**
 * Formats a file size in bytes to a human-readable string.
 * @param {number} bytes - The file size in bytes.
 * @returns {string} - The formatted file size (e.g. "2.45 MB", "420 KB").
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
