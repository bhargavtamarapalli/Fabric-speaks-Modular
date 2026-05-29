import { Readable } from 'stream';
import csvParser from 'csv-parser';
import { Queue } from 'bullmq';
import { AppError, ErrorCode, logger, getRedisClient } from '@fs/shared';
import {
  InventoryRepository,
  VariantStock,
  DeadStockVariant,
  DemandPattern,
} from '../repositories/inventory.repository';
import { ExpectedStockRepository, ExpectedStock } from '../repositories/expected-stock.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { BulkAdjustmentRowSchema } from '../schemas/inventory.schemas';
import { mapErrorToCsvCode } from '../errors/csv-errors';
import { INVENTORY_CONFIG } from '../config/inventory.config';

export interface BulkAdjustmentError {
  row: Record<string, unknown>;
  error: string;
}

export interface BulkAdjustmentResponse {
  success: number;
  failed: number;
  errors: BulkAdjustmentError[];
  duplicatesSkipped?: number;
}

/** Medium #1: Result type for manual adjustment — includes optional concurrent-access warning */
export interface ManualAdjustmentResult {
  variant: VariantStock;
  warning?: string;
}

export class InventoryService {
  private eventQueue: Queue;

  constructor(
    private invRepo: InventoryRepository,
    private expectedRepo: ExpectedStockRepository,
    private auditLogRepo: AuditLogRepository
  ) {
    const redis = getRedisClient();
    this.eventQueue = new Queue('platform_events', { connection: redis });
  }

  async listInventory(sortBy: 'asc' | 'desc' = 'asc'): Promise<VariantStock[]> {
    return this.invRepo.getAllVariants(sortBy);
  }

  async manualAdjustment(
    variantId: string,
    newQty: number,
    reason: string,
    adminUserId: string,
    idempotencyKey?: string
  ): Promise<ManualAdjustmentResult> {
    // Medium #1: Server-side double-submit prevention for manual adjustments
    if (idempotencyKey) {
      const redis = getRedisClient();
      const lockKey = `inventory:manual:${idempotencyKey}`;
      const acquired = await redis.setnx(lockKey, 'processing');
      if (!acquired) {
        throw new AppError(
          ErrorCode.PAYMENT_ALREADY_PROCESSED, // 409 Conflict
          'Duplicate manual adjustment detected. This request was already processed.'
        );
      }
      await redis.expire(lockKey, 3600); // 1 hour window
    }

    // Pre-flight check that variant exists and is not deleted.
    const currentVariant = await this.invRepo.getVariant(variantId);
    if (!currentVariant) {
      throw new AppError(ErrorCode.VARIANT_NOT_FOUND, `Variant ${variantId} not found`);
    }

    let warning: string | undefined;

    // Critical #6: adjustStock handles stock update + stock_adjustments atomically
    let updated: VariantStock;
    try {
      updated = await this.invRepo.adjustStock(variantId, newQty, reason, adminUserId);
    } catch (err) {
      // Medium #3: Detect serialization failures (concurrent write conflict on same variant)
      const msg = (err as Error).message || '';
      if (msg.includes('could not serialize') || msg.includes('deadlock detected')) {
        warning = `A concurrent stock update was detected for variant ${variantId}. Your change was applied but another update may have occurred simultaneously. Please verify the final stock level.`;
        // Re-throw so the transaction retries (PostgreSQL serialization error)
        throw err;
      }
      throw err;
    }

    // The admin_audit_log insert is best-effort outside the core transaction
    try {
      await this.auditLogRepo.insert({
        adminId: adminUserId,
        action: 'MANUAL_STOCK_ADJUSTMENT',
        entityType: 'INVENTORY',
        entityId: variantId,
        beforeJson: { stockQty: currentVariant.stockQty },
        afterJson: { stockQty: updated.stockQty, reason },
      });
    } catch (err) {
      logger.error('[InventoryService] Failed to write admin audit log for manualAdjustment', {
        variantId,
        error: (err as Error).message,
      });
    }

    logger.info(`Stock adjusted for variant ${variantId} to ${newQty} by ${adminUserId}`);

    // Critical #2: Event emission wrapped — failures never surface as 500 errors
    if (updated.stockQty <= 0) {
      await this.enqueueEvent('stock.critical', {
        variantId: updated.variantId,
        sku: updated.sku,
        size: updated.size,
        colour: updated.colour,
        productName: updated.productName,
        stockCount: updated.stockQty,
        threshold: updated.thresholdQty,
      });
    } else if (updated.stockQty < updated.thresholdQty) {
      await this.enqueueEvent('stock.low', {
        variantId: updated.variantId,
        sku: updated.sku,
        size: updated.size,
        colour: updated.colour,
        productName: updated.productName,
        stockCount: updated.stockQty,
        threshold: updated.thresholdQty,
      });
    }

    return { variant: updated, warning };
  }

  async bulkAdjustment(
    csvBuffer: Buffer,
    adminUserId: string,
    idempotencyKey?: string
  ): Promise<BulkAdjustmentResponse> {
    // High #1: Idempotency conflict should be a 409 Conflict, not 429 Rate Limit
    if (idempotencyKey) {
      const redis = getRedisClient();
      const lockKey = `inventory:bulk:${idempotencyKey}`;
      const acquired = await redis.setnx(lockKey, 'processing');
      if (!acquired) {
        throw new AppError(
          ErrorCode.PAYMENT_ALREADY_PROCESSED, // 409 Conflict — duplicate request
          'Duplicate request detected for idempotency key: ' + idempotencyKey
        );
      }
      await redis.expire(lockKey, 86400); // 24 hours
    }

    return new Promise((resolve, reject) => {
      const results: Array<Record<string, unknown>> = [];
      const errors: BulkAdjustmentError[] = [];
      let successCount = 0;
      let failedCount = 0;
      let duplicatesSkipped = 0;

      const stream = Readable.from(csvBuffer);

      stream
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          // High #4: Reject batches that exceed the maximum row limit
          if (results.length === 0) {
            // Medium #4: Handle empty CSV gracefully
            logger.warn('[InventoryService] Empty CSV uploaded for bulk adjustment');
            resolve({ success: 0, failed: 0, errors: [], duplicatesSkipped: 0 });
            return;
          }

          if (results.length > INVENTORY_CONFIG.BULK_UPLOAD.MAX_ROWS) {
            reject(
              new AppError(
                ErrorCode.BULK_UPLOAD_LIMIT,
                `Batch too large. Maximum ${INVENTORY_CONFIG.BULK_UPLOAD.MAX_ROWS} rows per upload. Submitted: ${results.length} rows.`
              )
            );
            return;
          }

          // Critical #3: Track processed variant IDs to detect duplicates
          const processedVariantIds = new Set<string>();

          for (let i = 0; i < results.length; i++) {
            const row: Record<string, unknown> = results[i] ?? {};
            try {
              // Validate row format first
              const validated = BulkAdjustmentRowSchema.parse(row);

              // Critical #3: Check for duplicate variant_id in this batch
              if (processedVariantIds.has(validated.variant_id)) {
                duplicatesSkipped++;
                errors.push({
                  row,
                  error: `Row ${i + 1}: Variant ${validated.variant_id} appears multiple times in this batch. Only the first occurrence was processed. Please check your CSV for duplicates.`,
                });
                failedCount++;
                continue;
              }
              processedVariantIds.add(validated.variant_id);

              await this._processBulkRow(validated, adminUserId);
              successCount++;
            } catch (err) {
              failedCount++;
              errors.push({ row, error: (err as Error).message });
            }
          }

          logger.info(`Bulk adjustment complete: ${successCount} success, ${failedCount} failed, ${duplicatesSkipped} duplicates skipped`);
          resolve({ success: successCount, failed: failedCount, errors, duplicatesSkipped });
        })
        .on('error', (err: Error) => {
          const specificErrorCode = mapErrorToCsvCode(err);
          const errorDetails = {
            originalError: err.message,
            errorCode: err.constructor.name,
            csvErrorCode: specificErrorCode,
          };
          logger.error('CSV parsing failed', errorDetails);
          reject(new AppError(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            specificErrorCode as any,
            `Failed to parse CSV: ${err.message}`,
            errorDetails
          ));
        });
    });
  }

  // Now accepts pre-validated row to avoid parsing twice
  private async _processBulkRow(
    validated: { variant_id: string; new_qty: number; reason: string },
    adminUserId: string
  ): Promise<void> {
    const currentVariant = await this.invRepo.getVariant(validated.variant_id);
    if (!currentVariant) {
      throw new AppError(
        ErrorCode.VARIANT_NOT_FOUND,
        `Variant ${validated.variant_id} not found`
      );
    }

    // Critical #6: adjustStock atomically updates stock + inserts in stock_adjustments
    const updated = await this.invRepo.adjustStock(
      validated.variant_id,
      validated.new_qty,
      validated.reason,
      adminUserId
    );

    try {
      await this.auditLogRepo.insert({
        adminId: adminUserId,
        action: 'BULK_STOCK_ADJUSTMENT',
        entityType: 'INVENTORY',
        entityId: validated.variant_id,
        beforeJson: { stockQty: currentVariant.stockQty },
        afterJson: { stockQty: updated.stockQty, reason: validated.reason },
      });
    } catch (err) {
      logger.error('[InventoryService] Failed to write admin audit log for bulkRow', {
        variantId: validated.variant_id,
        error: (err as Error).message,
      });
    }

    // Critical #2: enqueueEvent has retry + error swallowing; failures won't abort bulk
    if (updated.stockQty <= 0) {
      await this.enqueueEvent('stock.critical', {
        variantId: updated.variantId,
        sku: updated.sku,
        size: updated.size,
        colour: updated.colour,
        productName: updated.productName,
        stockCount: updated.stockQty,
        threshold: updated.thresholdQty,
      });
    } else if (updated.stockQty < updated.thresholdQty) {
      await this.enqueueEvent('stock.low', {
        variantId: updated.variantId,
        sku: updated.sku,
        size: updated.size,
        colour: updated.colour,
        productName: updated.productName,
        stockCount: updated.stockQty,
        threshold: updated.thresholdQty,
      });
    }
  }

  async addExpectedArrival(
    data: Omit<ExpectedStock, 'id' | 'is_received' | 'received_at'>,
    adminUserId: string
  ): Promise<ExpectedStock> {
    const variant = await this.invRepo.getVariant(data.variant_id);
    if (!variant) {
      throw new AppError(ErrorCode.NOT_FOUND, `Variant ${data.variant_id} not found`);
    }

    const arrival = await this.expectedRepo.addExpectedStock(data);

    await this.auditLogRepo.insert({
      adminId: adminUserId,
      action: 'ADD_EXPECTED_ARRIVAL',
      entityType: 'EXPECTED_STOCK',
      entityId: arrival.id,
      beforeJson: null,
      afterJson: arrival,
    });

    return arrival;
  }

  /**
   * Critical #4: Atomic arrival marking to prevent TOCTOU race condition.
   * Uses UPDATE...WHERE is_received = false RETURNING * so only one
   * concurrent request can ever succeed.
   */
  async markArrivalReceived(arrivalId: string, adminUserId: string): Promise<void> {
    // Atomic: UPDATE only succeeds if is_received is still false.
    // If two concurrent requests race, only one will get a row back.
    const received = await this.expectedRepo.receiveArrivalAtomic(arrivalId);

    if (!received) {
      // Determine if it's not found or already received
      const arrival = await this.expectedRepo.getById(arrivalId);
      if (!arrival) {
        throw new AppError(ErrorCode.NOT_FOUND, `Arrival ${arrivalId} not found`);
      }
      throw new AppError(
        ErrorCode.PAYMENT_ALREADY_PROCESSED, // 409 — already been marked received
        `Arrival ${arrivalId} is already marked as received`
      );
    }

    await this.auditLogRepo.insert({
      adminId: adminUserId,
      action: 'MARK_ARRIVAL_RECEIVED',
      entityType: 'EXPECTED_STOCK',
      entityId: arrivalId,
      beforeJson: { is_received: false },
      afterJson: { is_received: true, received_at: new Date() },
    });

    logger.info(`Arrival ${arrivalId} marked as received by ${adminUserId}`);

    // Critical #2: Event emission wrapped — failure won't block success response
    const updatedVariant = await this.invRepo.getVariant(received.variant_id);
    if (updatedVariant && updatedVariant.stockQty > 0) {
      await this.enqueueEvent('stock.replenished', {
        variantId: updatedVariant.variantId,
        productName: updatedVariant.productName,
        stockCount: updatedVariant.stockQty,
      });
    }
  }

  async updateThreshold(variantId: string, threshold: number, adminUserId: string): Promise<void> {
    const variant = await this.invRepo.getVariant(variantId);
    if (!variant) {
      throw new AppError(ErrorCode.NOT_FOUND, `Variant ${variantId} not found`);
    }

    await this.invRepo.updateThreshold(variantId, threshold);

    await this.auditLogRepo.insert({
      adminId: adminUserId,
      action: 'UPDATE_STOCK_THRESHOLD',
      entityType: 'INVENTORY',
      entityId: variantId,
      beforeJson: { thresholdQty: variant.thresholdQty },
      afterJson: { thresholdQty: threshold },
    });

    logger.info(
      `Stock threshold updated for variant ${variantId} to ${threshold} by ${adminUserId}`
    );
  }

  async getExpectedArrivals(): Promise<ExpectedStock[]> {
    return this.expectedRepo.getPendingArrivals();
  }

  async getHealth(): Promise<{ status: string; count: number }[]> {
    return this.invRepo.getHealthSummary();
  }

  async getInventoryWithVelocity(): Promise<VariantStock[]> {
    return this.invRepo.getInventoryWithSalesData();
  }

  async getRestockSuggestions(): Promise<VariantStock[]> {
    return this.invRepo.getRestockSuggestions();
  }

  async getDeadStock(days: number = 30): Promise<DeadStockVariant[]> {
    return this.invRepo.getDeadStock(days);
  }

  async getDemandPatterns(
    days: number = 30
  ): Promise<{ sizes: DemandPattern[]; colours: DemandPattern[] }> {
    return this.invRepo.getDemandPatterns(days);
  }

  /**
   * Critical #2 + Medium #2: enqueueEvent with retries and monitoring metrics.
   * Swallows failures after maxRetries — stock mutations always succeed.
   * A failed-queue counter is tracked in Redis for admin dashboard visibility.
   */
  private async enqueueEvent(name: string, payload: Record<string, unknown>): Promise<void> {
    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        await this.eventQueue.add(name, payload);
        return;
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          logger.error(
            `[InventoryService] Failed to enqueue ${name} after ${maxRetries} attempts. Stock mutation succeeded but notification lost.`,
            { payload, error: (error as Error).message }
          );
          // Medium #2: Increment a Redis counter so admin dashboard can surface queue health
          try {
            const redis = getRedisClient();
            await redis.incr('metrics:inventory:queue_failures');
            await redis.expire('metrics:inventory:queue_failures', 86400); // 24h rolling window
          } catch {
            // Ignore — metrics are best-effort
          }
          return; // Swallow — stock mutation already committed
        }
        // Exponential backoff: 100ms, 200ms, 400ms
        const delay = 100 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
