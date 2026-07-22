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
