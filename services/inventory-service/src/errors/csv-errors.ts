/**
 * CSV Processing Error Codes
 * Specific error codes for CSV parsing and row-level validation failures
 */
export enum CsvErrorCode {
  // File-level errors
  FILE_MISSING = 'CSV_FILE_MISSING',
  FILE_TOO_LARGE = 'CSV_FILE_TOO_LARGE',
  INVALID_ENCODING = 'CSV_INVALID_ENCODING',
  PARSE_ERROR = 'CSV_PARSE_ERROR',
  HEADER_MISSING = 'CSV_HEADER_MISSING',
  HEADER_MISMATCH = 'CSV_HEADER_MISMATCH',
  
  // Row-level errors
  ROW_VALIDATION_FAILED = 'CSV_ROW_VALIDATION_FAILED',
  DUPLICATE_VARIANT = 'CSV_DUPLICATE_VARIANT',
  VARIANT_NOT_FOUND = 'CSV_VARIANT_NOT_FOUND',
  INVALID_QTY = 'CSV_INVALID_QTY',
  INVALID_REASON = 'CSV_INVALID_REASON',
  UNKNOWN_ERROR = 'CSV_UNKNOWN_ERROR',
}

export interface CsvRowError {
  rowNumber: number;
  variantId?: string;
  field?: string;
  value?: any;
  errorCode: CsvErrorCode;
  message: string;
}

export interface CsvProcessingResult {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: CsvRowError[];
  processingTimeMs?: number;
}

/**
 * Map validation error to CSV error code
 */
export function mapErrorToCsvCode(error: any): CsvErrorCode {
  if (!error) return CsvErrorCode.UNKNOWN_ERROR;

  const message = (error.message || '').toLowerCase();

  if (message.includes('header')) return CsvErrorCode.HEADER_MISSING;
  if (message.includes('quote')) return CsvErrorCode.PARSE_ERROR;
  if (message.includes('encoding') || message.includes('invalid character'))
    return CsvErrorCode.INVALID_ENCODING;
  if (message.includes('enoent')) return CsvErrorCode.FILE_MISSING;
  if (message.includes('duplicate')) return CsvErrorCode.DUPLICATE_VARIANT;
  if (message.includes('not found')) return CsvErrorCode.VARIANT_NOT_FOUND;
  if (message.includes('quantity') || message.includes('qty'))
    return CsvErrorCode.INVALID_QTY;
  if (message.includes('reason')) return CsvErrorCode.INVALID_REASON;

  return CsvErrorCode.UNKNOWN_ERROR;
}
