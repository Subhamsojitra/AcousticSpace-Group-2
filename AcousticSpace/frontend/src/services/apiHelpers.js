import { API_BASE_URL } from '../config/apiConfig';

/**
 * Custom error class for API responses that do not have 2xx status codes.
 */
export class ApiError extends Error {
  constructor(message, status, data, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isNetworkError = isNetworkError;
  }
}

/**
 * Helper to process the fetch response, parsing JSON and checking response.ok.
 */
export async function handleResponse(response) {
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
 * Standard fetch request helper to reduce duplicate logic.
 */
export async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    return await handleResponse(response);
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Check if it's a TypeError or contains common network failure indicators
    const isNetwork = err instanceof TypeError || 
                      err.message?.includes('Failed to fetch') || 
                      err.message?.includes('network error') ||
                      err.message?.includes('Failed to upload');
    throw new ApiError(err.message || 'Request failed', 0, null, isNetwork);
  }
}

/**
 * Returns a standardized error message.
 * Normalizes TypeErrors and API errors into user-friendly prompts.
 */
export function getErrorMessage(error, apiStatus = 'online') {
  if (!error) {
    return 'An unexpected error occurred during audio classification.';
  }

  let rawMessage = '';
  let isNetwork = false;

  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
    if (error.isNetworkError) {
      isNetwork = true;
    }
  }

  isNetwork = isNetwork || 
              rawMessage.includes('Failed to fetch') || 
              rawMessage.includes('network error') || 
              rawMessage.includes('Failed to upload') ||
              rawMessage.includes('Network request failed');

  if (isNetwork) {
    if (apiStatus === 'offline') {
      return 'API Gateway is offline. Please make sure the backend is running and online.';
    }
    return 'Network connection failed. Please check your network connectivity and try again.';
  }

  return rawMessage || 'An unexpected error occurred during audio classification.';
}

/**
 * Validates the upload API response.
 */
export function validateUploadResponse(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Upload failed: Server returned an invalid response.');
  }
  const fileIdVal = data.file_path || data.file_name || data.file_id;
  if (!fileIdVal) {
    throw new Error('Upload failed: Server response is missing file identification metadata.');
  }
  return data;
}

/**
 * Validates the analysis API response.
 */
export function validateAnalysisResponse(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Analysis failed: Server returned an empty or invalid response.');
  }
  return data;
}

/**
 * Validates the prediction API response.
 */
export function validatePredictionResponse(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Prediction failed: Server returned an empty or invalid response.');
  }
  if (!data.prediction) {
    throw new Error('Prediction failed: Server response is missing prediction classification.');
  }
  return data;
}

/**
 * Validates the history API response.
 */
export function validateHistoryResponse(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('History retrieval failed: Server returned an invalid response.');
  }
  if (!Array.isArray(data.history)) {
    throw new Error('History retrieval failed: Server response is missing history list.');
  }
  return data;
}

/**
 * Formats a confidence score into a percentage string.
 */
export function formatConfidence(val) {
  if (val === null || val === undefined || val === '') return 'Available after backend inference';
  const num = Number(val);
  if (isNaN(num)) return 'Available after backend inference';
  const scaled = (num > 0 && num <= 1) ? num * 100 : num;
  return `${scaled.toFixed(1)}%`;
}

/**
 * Formats duration value.
 */
export function formatDuration(val) {
  if (val === null || val === undefined || val === '') return '—';
  const num = Number(val);
  return isNaN(num) ? '—' : `${num.toFixed(2)} s`;
}

/**
 * Formats sample rate value.
 */
export function formatSampleRate(val) {
  if (val === null || val === undefined || val === '') return '—';
  const num = Number(val);
  return isNaN(num) ? '—' : `${num} Hz`;
}

/**
 * Formats processing time value.
 */
export function formatProcessingTime(val) {
  if (val === null || val === undefined || val === '') return '—';
  const num = Number(val);
  return isNaN(num) ? '—' : `${num}s`;
}

/**
 * Normalizes prediction status string to lowercase ('real' | 'fake' | '').
 */
export function normalizePrediction(prediction) {
  if (typeof prediction === 'string') {
    const trimmed = prediction.trim().toLowerCase();
    if (trimmed === 'real' || trimmed === 'fake') {
      return trimmed;
    }
  }
  return '';
}

