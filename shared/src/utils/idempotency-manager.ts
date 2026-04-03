import { Redis } from 'ioredis';
import { AppError, ErrorCode } from '@fs/shared/errors';
import { logger } from '@fs/shared/logger';

export interface IdempotencyRecord {
  requestId: string;
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  error?: { code: string; message: string };
  createdAt: number;
  completedAt?: number;
}

/**
 * IdempotencyManager: Provides request deduplication for bulk operations
 * 
 * How it works:
 * 1. Client sends request with `Idempotency-Key` header
 * 2. Manager checks if key exists in Redis
 * 3. If exists: return cached result (prevent duplicate processing)
 * 4. If not exists: mark as "processing", execute operation, cache result
 * 5. If operation fails: store error, allow retry
 * 
 * TTL: 1 hour (for idempotency to work, client must retry within this window)
 */
export class IdempotencyManager {
  private redis: Redis;
  private ttlSeconds: number = 3600; // 1 hour

  constructor(redis: Redis, ttlSeconds?: number) {
    this.redis = redis;
    if (ttlSeconds) this.ttlSeconds = ttlSeconds;
  }

  /**
   * Check if request was already processed
   * Returns cached result if exists
   */
  async getIfExists(idempotencyKey: string): Promise<IdempotencyRecord | null> {
    try {
      const cached = await this.redis.get(this.getKey(idempotencyKey));
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (err: any) {
      logger.error({
        message: 'Failed to check idempotency cache',
        key: idempotencyKey,
        error: err.message,
      });
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Idempotency check failed'
      );
    }
  }

  /**
   * Mark request as processing
   * Prevents concurrent processing of same request
   */
  async markProcessing(idempotencyKey: string): Promise<boolean> {
    try {
      const record: IdempotencyRecord = {
        requestId: idempotencyKey,
        status: 'processing',
        createdAt: Date.now(),
      };

      // Use SETNX to only set if key doesn't exist
      const set = await this.redis.set(
        this.getKey(idempotencyKey),
        JSON.stringify(record),
        'EX',
        this.ttlSeconds,
        'NX' // Only set if not exists
      );

      return set === 'OK';
    } catch (err: any) {
      logger.error({
        message: 'Failed to mark processing in idempotency',
        key: idempotencyKey,
        error: err.message,
      });
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Idempotency processing mark failed'
      );
    }
  }

  /**
   * Store successful result
   */
  async markSuccess(idempotencyKey: string, result: any): Promise<void> {
    try {
      const record: IdempotencyRecord = {
        requestId: idempotencyKey,
        status: 'completed',
        result,
        createdAt: Date.now(),
        completedAt: Date.now(),
      };

      await this.redis.setex(
        this.getKey(idempotencyKey),
        this.ttlSeconds,
        JSON.stringify(record)
      );

      logger.info({
        message: 'Idempotency record stored (success)',
        key: idempotencyKey,
      });
    } catch (err: any) {
      logger.error({
        message: 'Failed to store idempotency success',
        key: idempotencyKey,
        error: err.message,
      });
      // Don't throw - cache failure shouldn't break operation
    }
  }

  /**
   * Store failed result
   */
  async markFailure(
    idempotencyKey: string,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    try {
      const record: IdempotencyRecord = {
        requestId: idempotencyKey,
        status: 'failed',
        error: { code: errorCode, message: errorMessage },
        createdAt: Date.now(),
        completedAt: Date.now(),
      };

      await this.redis.setex(
        this.getKey(idempotencyKey),
        this.ttlSeconds,
        JSON.stringify(record)
      );

      logger.info({
        message: 'Idempotency record stored (failure)',
        key: idempotencyKey,
        error: errorCode,
      });
    } catch (err: any) {
      logger.error({
        message: 'Failed to store idempotency failure',
        key: idempotencyKey,
        error: err.message,
      });
      // Don't throw - cache failure shouldn't break operation
    }
  }

  /**
   * Clean up idempotency record (manual cleanup if needed)
   */
  async delete(idempotencyKey: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(idempotencyKey));
    } catch (err: any) {
      logger.warn({
        message: 'Failed to delete idempotency record',
        key: idempotencyKey,
        error: err.message,
      });
    }
  }

  private getKey(idempotencyKey: string): string {
    return `idempotency:${idempotencyKey}`;
  }
}
