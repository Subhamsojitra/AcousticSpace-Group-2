import { 
  makeRequest, 
  ApiError,
  validateUploadResponse,
  validateAnalysisResponse,
  validatePredictionResponse,
  validateHistoryResponse
} from './apiHelpers';

export { ApiError };

/**
 * Uploads an audio file to the backend.
 * @param {File} file - The file object to upload.
 * @param {AbortSignal} [signal] - Optional abort signal to cancel the upload.
 * @returns {Promise<Object>} The upload result containing file_path, file_name, etc.
 */
export async function uploadAudio(file, signal) {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await makeRequest('/api/upload/', {
    method: 'POST',
    body: formData,
    signal,
    // Note: Do not set Content-Type header; the browser will set it with the multipart boundary.
  });
  return validateUploadResponse(res);
}

/**
 * Starts analysis on an uploaded audio file path.
 * @param {string} filePath - The server-side path of the uploaded file.
 * @param {AbortSignal} [signal] - Optional abort signal to cancel the analysis.
 * @returns {Promise<Object>} The analysis results.
 */
export async function analyzeAudio(filePath, signal) {
  if (!filePath) {
    throw new Error('No file_path provided for analysis.');
  }

  const res = await makeRequest('/api/analysis/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_path: filePath }),
    signal,
  });
  return validateAnalysisResponse(res);
}

/**
 * Predicts whether an uploaded audio file is Real or Fake.
 * @param {string} filePath - The server-side path of the uploaded file.
 * @param {AbortSignal} [signal] - Optional abort signal to cancel the prediction.
 * @returns {Promise<Object>} The prediction results.
 */
export async function predictAudio(filePath, signal) {
  if (!filePath) {
    throw new Error('No file_path provided for prediction.');
  }

  const res = await makeRequest('/api/predict/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_path: filePath }),
    signal,
  });
  return validatePredictionResponse(res);
}

/**
 * Retrieves the history of analyses.
 * @param {AbortSignal} [signal] - Optional abort signal to cancel the history fetch.
 * @returns {Promise<Object>} Object containing the array of previous analyses.
 */
export async function getHistory(signal) {
  const res = await makeRequest('/api/history/', {
    method: 'GET',
    signal,
  });
  return validateHistoryResponse(res);
}

