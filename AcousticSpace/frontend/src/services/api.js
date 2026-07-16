import { API_BASE_URL } from '../config/apiConfig';

/**
 * Custom error class for API responses that do not have 2xx status codes.
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Helper to process the fetch response, parsing JSON and checking response.ok.
 */
async function handleResponse(response) {
  let data = null;
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    data = await response.text().catch(() => null);
  }

  if (!response.ok) {
    let message = '';
    if (data) {
      if (typeof data === 'string') {
        message = data;
      } else if (typeof data === 'object') {
        if (data.message) {
          message = String(data.message);
        } else if (data.detail) {
          if (Array.isArray(data.detail)) {
            // Format FastAPI array of details nicely
            message = data.detail.map(item => {
              if (typeof item === 'string') return item;
              const path = item.loc ? item.loc.join('.') : '';
              const msg = item.msg || JSON.stringify(item);
              return path ? `${path}: ${msg}` : msg;
            }).join(', ');
          } else if (typeof data.detail === 'object') {
            message = JSON.stringify(data.detail);
          } else {
            message = String(data.detail);
          }
        }
      }
    }
    if (!message) {
      message = `Request failed with status ${response.status}`;
    }
    throw new ApiError(message, response.status, data);
  }

  return data;
}

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

  const response = await fetch(`${API_BASE_URL}/api/upload/`, {
    method: 'POST',
    body: formData,
    signal,
    // Note: Do not set Content-Type header; the browser will set it with the multipart boundary.
  });

  return handleResponse(response);
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

  const response = await fetch(`${API_BASE_URL}/api/analysis/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_path: filePath }),
    signal,
  });

  return handleResponse(response);
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

  const response = await fetch(`${API_BASE_URL}/api/predict/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_path: filePath }),
    signal,
  });

  return handleResponse(response);
}

/**
 * Retrieves the history of analyses.
 * @returns {Promise<Object>} Object containing the array of previous analyses.
 */
export async function getHistory() {
  const response = await fetch(`${API_BASE_URL}/api/history/`, {
    method: 'GET',
  });

  return handleResponse(response);
}

