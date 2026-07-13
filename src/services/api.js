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
    const message = (data && (data.message || data.detail || (typeof data === 'string' ? data : ''))) || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data;
}

/**
 * Uploads an audio file to the backend.
 * @param {File} file - The file object to upload.
 * @returns {Promise<Object>} The upload result containing file_id and filename.
 */
export async function uploadAudio(file) {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
    // Note: Do not set Content-Type header; the browser will set it with the multipart boundary.
  });

  return handleResponse(response);
}

/**
 * Starts analysis on an uploaded audio file.
 * @param {string} fileId - The ID of the uploaded file.
 * @returns {Promise<Object>} The analysis results.
 */
export async function analyzeAudio(fileId) {
  if (!fileId) {
    throw new Error('No file_id provided for analysis.');
  }

  const response = await fetch(`${API_BASE_URL}/analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_id: fileId }),
  });

  return handleResponse(response);
}

/**
 * Retrieves the history of analyses.
 * @returns {Promise<Array>} List of previous analyses.
 */
export async function getHistory() {
  const response = await fetch(`${API_BASE_URL}/history`, {
    method: 'GET',
  });

  return handleResponse(response);
}
