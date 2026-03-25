/**
 * Admin-specific error handling utilities
 * Re-exports and extends shared error utilities for admin pages
 */
import { ApiError } from '@/lib/apiClient';
import { getErrorMessage, parseError } from '@/lib/errorUtils';

/**
 * Map an error to a user-friendly message for display in admin UI
 * This is the canonical function used across all admin pages
 * @param error The error object (ApiError, Error, or unknown)
 * @returns A string message suitable for displaying to users
 */
export function mapError(error: ApiError | Error | unknown): string {
  return getErrorMessage(error);
}

/**
 * Parse an error to extract metadata for conditional error handling
 */
export { parseError };

/**
 * Check if an error is auth-related (401, unauthorized, session expired)
 */
export function isAuthError(error: ApiError | Error | unknown): boolean {
  if (error instanceof ApiError) {
    return error.statusCode === 401 || error.errorCode === 'UNAUTHORIZED' || error.errorCode === 'AUTH_FAILED';
  }
  return false;
}

/**
 * Check if an error can be retried (network errors, timeouts, 5xx errors)
 */
export function isRetryableError(error: ApiError | Error | unknown): boolean {
  const parsed = parseError(error);
  return parsed.isRetryable;
}

/**
 * Check if an error is a 404 or resource-not-found error
 */
export function isNotFoundError(error: ApiError | Error | unknown): boolean {
  if (error instanceof ApiError) {
    return error.statusCode === 404 || error.errorCode === 'NOT_FOUND';
  }
  return false;
}

/**
 * Check if an error is a network/connectivity error
 */
export function isNetworkError(error: ApiError | Error | unknown): boolean {
  const parsed = parseError(error);
  return parsed.isNetworkError;
}
