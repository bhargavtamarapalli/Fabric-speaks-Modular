/**
 * CSV Processing Error Codes
 * Specific error codes for CSV parsing and row-level validation failures
 */
export enum CsvErrorCode {
  // File-level errors
  CSV_FILE_MISSING = 'CSV_FILE_MISSING',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_ENCODING = 'INVALID_ENCODING',
  PARSE_ERROR = 'PARSE_ERROR',
  HEADER_MISSING = 'HEADER_MISSING',
  HEADER_MISMATCH = 'HEADER_MISMATCH',
  
  // Row-level errors
  ROW_VALIDATION_FAILED = 'ROW_VALIDATION_FAILED',
  DUPLICATE_VARIANT = 'DUPLICATE_VARIANT',
  VARIANT_NOT_FOUND = 'VARIANT_NOT_FOUND',
  INVALID_QTY = 'INVALID_QTY',
  INVALID_REASON = 'INVALID_REASON',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
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
  if (!error) return CsvErrorCode.PARSE_ERROR;

  const message = (error.message || '').toLowerCase();

  if (message.includes('header') || (message.includes('column') && message.includes('missing'))) return CsvErrorCode.HEADER_MISSING;
  if (message.includes('quote')) return CsvErrorCode.PARSE_ERROR;
  if (
    message.includes('encoding') ||
    message.includes('invalid character') ||
    message.includes('utf-8') ||
    message.includes('utf8') ||
    message.includes('sequence')
  )
    return CsvErrorCode.INVALID_ENCODING;
  if (message.includes('enoent') || message.includes('no such file'))
    return CsvErrorCode.CSV_FILE_MISSING;
  if (message.includes('duplicate')) return CsvErrorCode.DUPLICATE_VARIANT;
  if (message.includes('not found')) return CsvErrorCode.VARIANT_NOT_FOUND;
  if (message.includes('validation')) return CsvErrorCode.ROW_VALIDATION_FAILED;
  if (message.includes('quantity') || message.includes('qty'))
    return CsvErrorCode.INVALID_QTY;
  if (message.includes('reason')) return CsvErrorCode.INVALID_REASON;

  return CsvErrorCode.PARSE_ERROR;
}
