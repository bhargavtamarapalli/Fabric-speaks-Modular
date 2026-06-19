import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IdempotencyManager } from '../idempotency-manager';

describe('IdempotencyManager (Task 1.4)', () => {
  let idempotencyManager: IdempotencyManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRedisClient: any;

  beforeEach(() => {
    mockRedisClient = {
      get: vi.fn(),
      setex: vi.fn(),
      setnx: vi.fn(),
      del: vi.fn(),
      expire: vi.fn(),
    };

    idempotencyManager = new IdempotencyManager(mockRedisClient);
  });

  describe('getIfExists()', () => {
    it('should return cached result if idempotency key exists', async () => {
      const key = 'idempotency-key-123';
      const cachedResult = { success: true, variantCount: 50 };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await idempotencyManager.getIfExists(key);

      expect(result).toEqual(cachedResult);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should return null if key does not exist', async () => {
      const key = 'nonexistent-key';
      mockRedisClient.get.mockResolvedValue(null);

      const result = await idempotencyManager.getIfExists(key);

      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json {');

      const result = await idempotencyManager.getIfExists('key').catch(e => e);
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('markProcessing()', () => {
    it('should acquire lock for processing state', async () => {
      const key = 'request-123';
      mockRedisClient.setnx.mockResolvedValue(1);

      const acquired = await idempotencyManager.markProcessing(key);

      expect(acquired).toBe(true);
      expect(mockRedisClient.setnx).toHaveBeenCalledWith(key, 'processing');
      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, 3600); // 1 hour
    });

    it('should return false if lock already exists', async () => {
      const key = 'request-123';
      mockRedisClient.setnx.mockResolvedValue(0);

      const acquired = await idempotencyManager.markProcessing(key);

      expect(acquired).toBe(false);
    });

    it('should set appropriate TTL after acquiring lock', async () => {
      const key = 'request-123';
      mockRedisClient.setnx.mockResolvedValue(1);

      await idempotencyManager.markProcessing(key);

      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, 3600);
    });
  });

  describe('markSuccess()', () => {
    it('should cache successful result with TTL', async () => {
      const key = 'request-123';
      const result = { updated: 50, errors: [] };

      await idempotencyManager.markSuccess(key, result);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        key,
        3600, // 1 hour TTL
        JSON.stringify({ status: 'success', data: result })
      );
    });

    it('should handle large result objects', async () => {
      const key = 'request-large';
      const largeResult = {
        items: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` })),
      };

      await idempotencyManager.markSuccess(key, largeResult);

      expect(mockRedisClient.setex).toHaveBeenCalled();
      const callArgs = mockRedisClient.setex.mock.calls[0];
      expect(typeof callArgs[2]).toBe('string'); // Serialized JSON
    });

    it('should handle serialization errors', async () => {
      const key = 'request-123';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const circularResult: any = { self: null };
      circularResult.self = circularResult; // Create circular reference

      await expect(
        idempotencyManager.markSuccess(key, circularResult)
      ).rejects.toThrow();
    });
  });

  describe('markFailure()', () => {
    it('should cache error response with TTL', async () => {
      const key = 'request-123';
      const errorResponse = { code: 'DUPLICATE_SKU', message: 'SKU already exists' };

      await idempotencyManager.markFailure(key, errorResponse.code, errorResponse.message);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        key,
        3600,
        JSON.stringify({ status: 'error', error: errorResponse })
      );
    });

    it('should include error code in cached response', async () => {
      const key = 'request-123';
      const errorResponse = { code: 'VALIDATION_ERROR', message: 'Invalid data' };

      await idempotencyManager.markFailure(key, errorResponse.code, errorResponse.message);

      const callArgs = mockRedisClient.setex.mock.calls[0];
      const cachedData = JSON.parse(callArgs[2]);
      expect(cachedData.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('delete()', () => {
    it('should delete the idempotency key from cache', async () => {
      const key = 'request-123';

      await idempotencyManager.delete(key);

      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });

    it('should handle Redis connection errors', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis down'));

      await expect(idempotencyManager.delete('key')).rejects.toThrow('Redis down');
    });
  });

  describe('Full Request Lifecycle', () => {
    it('should handle successful request with caching', async () => {
      const key = 'bulk-update-123';
      const result = { success: true, count: 42 };

      // First request - not in cache
      mockRedisClient.get.mockResolvedValue(null);
      expect(await idempotencyManager.getIfExists(key)).toBeNull();

      // Acquire processing lock
      mockRedisClient.setnx.mockResolvedValue(1);
      expect(await idempotencyManager.markProcessing(key)).toBe(true);

      // Mark as successful
      await idempotencyManager.markSuccess(key, result);

      // Verify result is cached
      mockRedisClient.get.mockResolvedValue(
        JSON.stringify({ status: 'success', data: result })
      );
      const cachedResult = await idempotencyManager.getIfExists(key);
      expect(cachedResult).toEqual({ status: 'success', data: result });
    });

    it('should prevent concurrent processing of same key', async () => {
      const key = 'concurrent-update-123';

      // First request acquires lock
      mockRedisClient.setnx.mockResolvedValueOnce(1);
      expect(await idempotencyManager.markProcessing(key)).toBe(true);

      // Second request fails to acquire lock
      mockRedisClient.setnx.mockResolvedValueOnce(0);
      expect(await idempotencyManager.markProcessing(key)).toBe(false);
    });

    it('should cache errors for failed requests', async () => {
      const key = 'failed-request-123';
      const error = { code: 'DUPLICATE_SKU', message: 'Duplicate found' };

      await idempotencyManager.markFailure(key, error.code, error.message);

      // Verify error is cached
      mockRedisClient.get.mockResolvedValue(
        JSON.stringify({ status: 'error', error })
      );
      const cachedError = await idempotencyManager.getIfExists(key);
      expect(cachedError).toEqual({ status: 'error', error });
    });
  });

  describe('TTL Management', () => {
    it('should set 1 hour TTL for all cached results', async () => {
      const key = 'key-123';

      // Success cache
      await idempotencyManager.markSuccess(key, {});
      expect(mockRedisClient.setex.mock.calls[0][1]).toBe(3600);

      await idempotencyManager.markFailure(key, 'ERROR_CODE', 'Error message');
      expect(mockRedisClient.setex.mock.calls[1][1]).toBe(3600);

      // Processing lock
      mockRedisClient.setnx.mockResolvedValue(1);
      await idempotencyManager.markProcessing(key);
      expect(mockRedisClient.expire.mock.calls[0][1]).toBe(3600);
    });

    it('should prevent cache expiration during processing', async () => {
      const key = 'key-123';
      mockRedisClient.setnx.mockResolvedValue(1);

      await idempotencyManager.markProcessing(key);

      // TTL is set to 1 hour to allow sufficient time for processing
      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, 3600);
    });
  });
});
