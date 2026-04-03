import { describe, it, expect } from 'vitest';
import { CsvErrorCode, mapErrorToCsvCode } from '../csv-errors';

describe('CSV Error Handling (Task 1.5)', () => {
  describe('CsvErrorCode Enum', () => {
    it('should define all required CSV error codes', () => {
      expect(CsvErrorCode.CSV_FILE_MISSING).toBe('CSV_FILE_MISSING');
      expect(CsvErrorCode.HEADER_MISSING).toBe('HEADER_MISSING');
      expect(CsvErrorCode.INVALID_ENCODING).toBe('INVALID_ENCODING');
      expect(CsvErrorCode.PARSE_ERROR).toBe('PARSE_ERROR');
      expect(CsvErrorCode.ROW_VALIDATION_FAILED).toBe('ROW_VALIDATION_FAILED');
      expect(CsvErrorCode.DUPLICATE_VARIANT).toBe('DUPLICATE_VARIANT');
      expect(CsvErrorCode.VARIANT_NOT_FOUND).toBe('VARIANT_NOT_FOUND');
      expect(CsvErrorCode.INVALID_QTY).toBe('INVALID_QTY');
      expect(CsvErrorCode.INVALID_REASON).toBe('INVALID_REASON');
    });

    it('should be used as string values for API responses', () => {
      const codes = Object.values(CsvErrorCode);
      codes.forEach(code => {
        expect(typeof code).toBe('string');
        expect(code).toMatch(/^[A-Z_]+$/); // UPPER_SNAKE_CASE format
      });
    });
  });

  describe('mapErrorToCsvCode()', () => {
    it('should map file not found errors to CSV_FILE_MISSING', () => {
      const error = new Error('ENOENT: no such file or directory');
      const code = mapErrorToCsvCode(error);
      expect(code).toBe(CsvErrorCode.CSV_FILE_MISSING);
    });

    it('should map encoding errors to INVALID_ENCODING', () => {
      const error = new Error('Invalid UTF-8 encoding');
      const code = mapErrorToCsvCode(error);
      expect(code).toBe(CsvErrorCode.INVALID_ENCODING);
    });

    it('should map quote/format errors to PARSE_ERROR', () => {
      const quoteError = new Error('Mismatched quotes in CSV');
      expect(mapErrorToCsvCode(quoteError)).toBe(CsvErrorCode.PARSE_ERROR);

      const formatError = new Error('Invalid CSV format');
      expect(mapErrorToCsvCode(formatError)).toBe(CsvErrorCode.PARSE_ERROR);
    });

    it('should map missing header errors to HEADER_MISSING', () => {
      const error = new Error('Required header column "sku" not found');
      const code = mapErrorToCsvCode(error);
      expect(code).toBe(CsvErrorCode.HEADER_MISSING);
    });

    it('should map validation errors to ROW_VALIDATION_FAILED', () => {
      const error = new Error('Row 5: Failed validation - qty must be positive');
      const code = mapErrorToCsvCode(error);
      expect(code).toBe(CsvErrorCode.ROW_VALIDATION_FAILED);
    });

    it('should map duplicate variant errors to DUPLICATE_VARIANT', () => {
      const error = new Error('Duplicate SKU in batch: SKU001');
      const code = mapErrorToCsvCode(error);
      expect(code).toBe(CsvErrorCode.DUPLICATE_VARIANT);
    });

    it('should map variant not found errors to VARIANT_NOT_FOUND', () => {
      const error = new Error('Variant with ID abc123 not found');
      const code = mapErrorToCsvCode(error);
      expect(code).toBe(CsvErrorCode.VARIANT_NOT_FOUND);
    });

    it('should map quantity-related errors to INVALID_QTY', () => {
      const negativeQtyError = new Error('Quantity cannot be negative');
      expect(mapErrorToCsvCode(negativeQtyError)).toBe(CsvErrorCode.INVALID_QTY);

      const zeroQtyError = new Error('Row 3: qty must be greater than 0');
      expect(mapErrorToCsvCode(zeroQtyError)).toBe(CsvErrorCode.INVALID_QTY);

      const parseQtyError = new Error('qty must be a number');
      expect(mapErrorToCsvCode(parseQtyError)).toBe(CsvErrorCode.INVALID_QTY);
    });

    it('should map reason/description errors to INVALID_REASON', () => {
      const error = new Error('Reason field is required');
      const code = mapErrorToCsvCode(error);
      expect(code).toBe(CsvErrorCode.INVALID_REASON);
    });

    it('should map unknown errors to PARSE_ERROR as fallback', () => {
      const unknownError = new Error('Some random error');
      const code = mapErrorToCsvCode(unknownError);
      expect(code).toBe(CsvErrorCode.PARSE_ERROR);
    });

    it('should handle Error objects with custom message property', () => {
      const customError = {
        message: 'Invalid UTF-8 encoding in CSV stream',
        name: 'EncodingError',
      };
      const code = mapErrorToCsvCode(customError as Error);
      expect(code).toBe(CsvErrorCode.INVALID_ENCODING);
    });

    it('should handle empty or null error messages', () => {
      const errorNoMessage = new Error();
      errorNoMessage.message = '';
      expect(mapErrorToCsvCode(errorNoMessage)).toBe(CsvErrorCode.PARSE_ERROR);
    });
  });

  describe('Error Code Coverage', () => {
    it('should have mappings for all common CSV errors', () => {
      const testCases = [
        { error: 'ENOENT: no such file', expected: CsvErrorCode.CSV_FILE_MISSING },
        { error: 'UTF-8 encoding error', expected: CsvErrorCode.INVALID_ENCODING },
        { error: 'sku column missing', expected: CsvErrorCode.HEADER_MISSING },
        { error: 'qty must be positive', expected: CsvErrorCode.INVALID_QTY },
        { error: 'reason is required', expected: CsvErrorCode.INVALID_REASON },
        { error: 'duplicate SKU', expected: CsvErrorCode.DUPLICATE_VARIANT },
        { error: 'variant not found', expected: CsvErrorCode.VARIANT_NOT_FOUND },
      ];

      testCases.forEach(({ error, expected }) => {
        const result = mapErrorToCsvCode(new Error(error));
        expect(result).toBe(expected);
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should continue to recognize legacy error patterns', () => {
      const legacyErrors = [
        'Failed to parse CSV',
        'Invalid CSV file',
        'CSV parsing failed',
      ];

      legacyErrors.forEach(msg => {
        const code = mapErrorToCsvCode(new Error(msg));
        expect(code).toBeDefined();
        expect(typeof code).toBe('string');
      });
    });
  });

  describe('Error Detail Preservation', () => {
    it('should preserve original error message in context', () => {
      const originalMsg = 'Row 42: Expected 5 columns, got 3';
      const error = new Error(originalMsg);
      const code = mapErrorToCsvCode(error);

      expect(code).toBeDefined();
      expect(error.message).toBe(originalMsg); // Original preserved
    });

    it('should work with Error subclasses', () => {
      class CustomCsvError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomCsvError';
        }
      }

      const error = new CustomCsvError('Invalid UTF-8 sequence');
      const code = mapErrorToCsvCode(error);
      expect(code).toBe(CsvErrorCode.INVALID_ENCODING);
    });
  });
});
