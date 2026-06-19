/**
 * Error utility functions for mapping API errors to user-friendly messages
 */
import { ApiError } from '@/lib/apiClient';

export interface ParsedError {
  code: string;
  statusCode: number;
  message: string;
  isRetryable: boolean;
  isAuthError: boolean;
  isNetworkError: boolean;
}

/**
 * Map error codes and status codes to user-friendly messages
 */
export function getUserFriendlyMessage(error: ApiError | Error | unknown): string {
  if (error instanceof ApiError) {
    switch (error.errorCode) {
      case 'TIMEOUT_ERROR':
        return 'Request timed out. Please check your connection and try again.';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your internet connection.';
      case 'UNAUTHORIZED':
      case 'AUTH_FAILED':
        return 'Your session has expired. Please log in again.';
      case 'FORBIDDEN':
        return 'You do not have permission to perform this action.';
      case 'NOT_FOUND':
        return 'The requested item was not found or has been deleted.';
      case 'VALIDATION_ERROR':
        return error.message; // API should provide field-specific message
      case 'DUPLICATE':
        return 'This item already exists. Please use a different value.';
      case 'UNKNOWN_ERROR':
        return 'An unexpected error occurred. Please try again.';
      default:
        return error.message || 'An error occurred. Please try again.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Parse an error to extract useful information for error handling
 */
export function parseError(error: ApiError | Error | unknown): ParsedError {
  const defaultParsed: ParsedError = {
    code: 'UNKNOWN',
    statusCode: 0,
    message: 'An unexpected error occurred',
    isRetryable: false,
    isAuthError: false,
    isNetworkError: false,
  };

  if (error instanceof ApiError) {
    const isAuthError = error.statusCode === 401 || error.errorCode === 'UNAUTHORIZED' || error.errorCode === 'AUTH_FAILED';
    const isNetworkError = error.errorCode === 'NETWORK_ERROR' || error.errorCode === 'TIMEOUT_ERROR';
    
    return {
      code: error.errorCode,
      statusCode: error.statusCode,
      message: getUserFriendlyMessage(error),
      // Retryable: network errors, timeouts, and server errors (non-validation)
      isRetryable: isNetworkError || (error.statusCode >= 500) || error.statusCode === 429,
      isAuthError,
      isNetworkError,
    };
  }

  if (error instanceof Error) {
    return {
      ...defaultParsed,
      message: error.message,
    };
  }

  return defaultParsed;
}

/**
 * Extract error message for display in UI
 * @param error The error object
 * @param defaultMessage Optional fallback message
 */
export function getErrorMessage(error: ApiError | Error | unknown, defaultMessage?: string): string {
  if (error instanceof ApiError) {
    return getUserFriendlyMessage(error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage || 'An error occurred. Please try again.';
}

/**
 * Check if an error is retryable (network error, timeout, or server error)
 */
export function isRetryableError(error: ApiError | Error | unknown): boolean {
  const parsed = parseError(error);
  return parsed.isRetryable;
}

/**
 * Check if an error is authentication-related
 */
export function isAuthError(error: ApiError | Error | unknown): boolean {
  const parsed = parseError(error);
  return parsed.isAuthError;
}
