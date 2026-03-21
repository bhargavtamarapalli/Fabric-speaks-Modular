// ─────────────────────────────────────────────────────────────────────────────
// Fabric Speaks — Admin Error Mapping Utility
// ─────────────────────────────────────────────────────────────────────────────

export const ERROR_MAP: Record<string, string> = {
  // ─── Authentication & Authorization ─────────────────────────────────────────
  'UNAUTHORIZED': 'Your session has expired. Please log in again to continue.',
  'FORBIDDEN': 'Access Denied: You do not have the required permissions for this action.',
  'SESSION_EXPIRED': 'Your session has timed out. For security, please log in again.',
  'AUTH_FAILED': 'Authentication failed. Please check your credentials.',
  'ROLE_REQUIRED': 'A valid admin role is required to access this area.',
  'TOKEN_EXPIRED': 'Your security token has expired. Refreshing your session...',
  'PERMISSION_DENIED': 'You do not have permission to view or modify this resource.',

  // ─── API & Network ─────────────────────────────────────────────────────────
  'ECONNREFUSED': 'Could not connect to the server. Please check your internet connection and try again.',
  'NETWORK_ERROR': 'Network failure detected. Please verify your internet connection.',
  'TIMEOUT': 'The request timed out. The server might be busy, please try again in a moment.',
  'API_COMMUNICATION_ERROR': 'A problem occurred while communicating with our services. Please try again.',
  'GATEWAY_TIMEOUT': 'Server gateway timeout. We are experiencing high traffic, please wait.',

  // ─── Data & Validation ─────────────────────────────────────────────────────
  'BAD_REQUEST': 'Invalid request. Please ensure all required fields are correctly filled.',
  'VALIDATION_FAILED': 'Form validation failed. Please correct the highlighted errors.',
  'DUPLICATE': 'This record already exists in our system.',
  'NOT_FOUND': 'The requested resource could not be found or may have been deleted.',
  'RESOURCE_GONE': 'The resource you are looking for is no longer available.',

  // ─── Database Operations ───────────────────────────────────────────────────
  'P2002': 'Database Error: A unique constraint failed (this record already exists).',
  'P2025': 'Database Error: The requested record was not found for this operation.',
  'P2003': 'Database Error: Foreign key constraint failed. Related data might be missing.',
  '5432': 'Primary database connection failed. System administrators have been notified.',
  'ETIMEDOUT': 'Database operation timed out. Please try again.',

  // ─── File & Media Processing ───────────────────────────────────────────────
  'UPLOAD_FAILED': 'File upload failed. Please check the file format and size.',
  'FILE_TOO_LARGE': 'The selected file exceeds the 5MB size limit.',
  'INVALID_FILE_TYPE': 'Unsupported file type. Please upload a JPG, PNG, or WebP image.',
  'PROCESSING_ERROR': 'An error occurred while processing your file/image. Please try again.',

  // ─── Firebase/Auth Specifics ──────────────────────────────────────────────
  'auth/user-not-found': 'Account not found. Please verify your email address.',
  'auth/wrong-password': 'The password you entered is incorrect.',
  'auth/network-request-failed': 'A network error occurred during login. Please try again.',
  'auth/too-many-requests': 'Account locked due to too many failed attempts. Please reset your password or try later.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/user-disabled': 'This admin account has been disabled. Please contact the super admin.',

  // ─── Standard Failbacks ────────────────────────────────────────────────────
  'INTERNAL_SERVER_ERROR': 'A server-side error occurred. Our engineering team has been alerted.',
  'UNKNOWN_ERROR': 'An unexpected error occurred. Refreshing the page may help.',
};

/**
 * Translates a technical error into a user-friendly message.
 * Accepts error codes, error objects, or raw strings.
 */
export function mapError(error: any): string {
  if (!error) return ERROR_MAP['UNKNOWN_ERROR'];

  // If it's a string, check the map
  if (typeof error === 'string') {
    return ERROR_MAP[error] || error;
  }

  // Handle nested technical messages
  const message = (error.message || '').toString();
  
  // High-level patterns
  if (message.includes('ECONNREFUSED') || message.includes('5432')) return ERROR_MAP['5432'];
  if (message.includes('timeout')) return ERROR_MAP['TIMEOUT'];
  if (message.includes('permission denied') || message.includes('forbidden')) return ERROR_MAP['PERMISSION_DENIED'];
  if (message.includes('not found')) return ERROR_MAP['NOT_FOUND'];
  if (message.includes('network')) return ERROR_MAP['NETWORK_ERROR'];
  if (message.includes('large') || message.includes('limit')) return ERROR_MAP['FILE_TOO_LARGE'];

  // If it's an object with a code or errorCode (common in our API and Firebase)
  const code = error.code || error.errorCode || error.name;
  if (code && ERROR_MAP[code]) {
    return ERROR_MAP[code];
  }

  // Handle specific HTTP status codes if available (e.g., from Axios or native fetch response)
  const status = error.status || (error.response && error.response.status);
  if (status) {
    if (status === 401) return ERROR_MAP['UNAUTHORIZED'];
    if (status === 403) return ERROR_MAP['FORBIDDEN'];
    if (status === 404) return ERROR_MAP['NOT_FOUND'];
    if (status === 429) return ERROR_MAP['auth/too-many-requests'];
    if (status >= 500) return ERROR_MAP['INTERNAL_SERVER_ERROR'];
  }

  // Check the message itself against the map
  if (error.message && ERROR_MAP[error.message]) {
    return ERROR_MAP[error.message];
  }

  // Fallback to a generic message if we can't find a better one
  return error.message || ERROR_MAP['UNKNOWN_ERROR'];
}
