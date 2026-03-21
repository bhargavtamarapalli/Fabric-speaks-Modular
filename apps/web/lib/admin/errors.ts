// ─────────────────────────────────────────────────────────────────────────────
// Fabric Speaks — Admin Error Mapping Utility
// ─────────────────────────────────────────────────────────────────────────────

export const ERROR_MAP: Record<string, string> = {
  // Common API Errors
  'ECONNREFUSED': 'Could not connect to the server. Please check your internet.',
  'NETWORK_ERROR': 'Network failure. Please check your connection.',
  'TIMEOUT': 'The request took too long. Please try again.',
  'UNAUTHORIZED': 'Your session has expired. Please log in again.',
  'FORBIDDEN': 'You do not have permission to perform this action.',
  'NOT_FOUND': 'The requested item was not found.',
  'DUPLICATE': 'This item already exists.',
  'VALIDATION_FAILED': 'Please check the form for errors.',
  'INTERNAL_SERVER_ERROR': 'Something went wrong on our end. We are looking into it.',

  // Firebase/Auth Errors
  'auth/user-not-found': 'User not found.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/network-request-failed': 'Network error during authentication.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',

  // MongoDB/Cast Errors
  'CastError': 'Invalid ID format provided.',
  'ValidationError': 'Data validation failed. Please check your input.',

  // Specific Business Logic
  'INSUFFICIENT_STOCK': 'Not enough stock available for this action.',
  'CANCEL_NOT_ALLOWED': 'This order cannot be cancelled in its current state.',
  'REFUND_FAILED': 'Refund processing failed. Please check Razorpay logs.',
};

/**
 * Translates a technical error into a user-friendly message.
 * Accepts error codes, error objects, or raw strings.
 */
export function mapError(error: any): string {
  if (!error) return 'An unknown error occurred.';

  // If it's a string, check the map
  if (typeof error === 'string') {
    return ERROR_MAP[error] || error;
  }

  // If it's an object with a code or errorCode (common in our API and Firebase)
  const code = error.code || error.errorCode;
  if (code && ERROR_MAP[code]) {
    return ERROR_MAP[code];
  }

  // If it's an Axios/Fetch error with a message
  if (error.message && !error.message.includes('code')) {
    // If the message is a code itself (some APIs do this)
    if (ERROR_MAP[error.message]) return ERROR_MAP[error.message];
    return error.message;
  }

  // Fallback to a generic message if we can't find a better one
  return 'Something went wrong. Please try again.';
}
