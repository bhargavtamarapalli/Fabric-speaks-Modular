/**
 * Inventory Service Configuration
 * Single source of truth for all limits and constants.
 * CRITICAL #7: Centralizing file size limits to avoid mismatches between
 * Multer middleware (routes) and manual validation (controller).
 */
export const INVENTORY_CONFIG = {
  BULK_UPLOAD: {
    /** Max CSV file size in bytes (5MB). Applied in both Multer and controller. */
    MAX_FILE_SIZE: 5 * 1024 * 1024,
    /** Max rows per bulk adjustment CSV batch */
    MAX_ROWS: 1000,
    /** Allowed MIME types for CSV upload */
    ALLOWED_MIMETYPES: ['text/csv', 'application/vnd.ms-excel'],
    /** Max bulk upload requests per minute per user (distributed via Redis) */
    RATE_LIMIT_MAX: 20,
    /** Rate limit window in seconds */
    RATE_LIMIT_WINDOW_SECONDS: 60,
  },
} as const;
