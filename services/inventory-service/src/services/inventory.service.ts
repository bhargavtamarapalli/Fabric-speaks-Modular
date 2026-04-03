import {
  InventoryRepository,
  VariantStock,
  DeadStockVariant,
  DemandPattern,
} from '../repositories/inventory.repository';
import { ExpectedStockRepository, ExpectedStock } from '../repositories/expected-stock.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { BulkAdjustmentRowSchema } from '../schemas/inventory.schemas';
import { AppError, ErrorCode, logger, getRedisClient } from '@fs/shared';
import { CsvErrorCode, mapErrorToCsvCode } from '../errors/csv-errors';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { Queue } from 'bullmq';

export interface BulkAdjustmentError {
  row: Record<string, any>;
  error: string;
}

export interface BulkAdjustmentResponse {
  success: number;
  failed: number;
  errors: BulkAdjustmentError[];
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
    adminUserId: string
  ): Promise<VariantStock> {
    const currentVariant = await this.invRepo.getVariant(variantId);
    if (!currentVariant) {
      throw new AppError(ErrorCode.NOT_FOUND, `Variant ${variantId} not found`);
    }

    const updated = await this.invRepo.adjustStock(variantId, newQty, reason, adminUserId);

    await this.auditLogRepo.insert({
      adminId: adminUserId,
      action: 'MANUAL_STOCK_ADJUSTMENT',
      entityType: 'INVENTORY',
      entityId: variantId,
      beforeJson: { stockQty: currentVariant.stockQty },
      afterJson: { stockQty: updated.stockQty, reason },
    });

    logger.info(`Stock adjusted for variant ${variantId} to ${newQty} by ${adminUserId}`);

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

    return updated;
  }

  async bulkAdjustment(
    csvBuffer: Buffer,
    adminUserId: string,
    idempotencyKey?: string
  ): Promise<BulkAdjustmentResponse> {
    if (idempotencyKey) {
      const redis = getRedisClient();
      const lockKey = `inventory:bulk:${idempotencyKey}`;
      const acquired = await redis.setnx(lockKey, 'processing');
      if (!acquired) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          'Duplicate request detected for idempotency key: ' + idempotencyKey
        );
      }
      await redis.expire(lockKey, 86400); // 24 hours
    }

    return new Promise((resolve, reject) => {
      const results: Array<Record<string, any>> = [];
      const errors: BulkAdjustmentError[] = [];
      let successCount = 0;
      let failedCount = 0;

      const stream = Readable.from(csvBuffer);

      stream
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          for (const row of results) {
            try {
              await this._processBulkRow(row, adminUserId);
              successCount++;
            } catch (err) {
              failedCount++;
              errors.push({ row, error: (err as Error).message });
            }
          }

          logger.info(`Bulk adjustment complete: ${successCount} success, ${failedCount} failed`);
          resolve({ success: successCount, failed: failedCount, errors });
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
            specificErrorCode as any,
            `Failed to parse CSV: ${err.message}`,
            errorDetails
          ));
        });
    });
  }

  private async _processBulkRow(row: any, adminUserId: string): Promise<void> {
    const validated = BulkAdjustmentRowSchema.parse(row);

    const currentVariant = await this.invRepo.getVariant(validated.variant_id);
    if (!currentVariant) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `Variant ${validated.variant_id} not found`
      );
    }

    const updated = await this.invRepo.adjustStock(
      validated.variant_id,
      validated.new_qty,
      validated.reason,
      adminUserId
    );

    await this.auditLogRepo.insert({
      adminId: adminUserId,
      action: 'BULK_STOCK_ADJUSTMENT',
      entityType: 'INVENTORY',
      entityId: validated.variant_id,
      beforeJson: { stockQty: currentVariant.stockQty },
      afterJson: { stockQty: updated.stockQty, reason: validated.reason },
    });

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

  async markArrivalReceived(arrivalId: string, adminUserId: string): Promise<void> {
    const arrival = await this.expectedRepo.getById(arrivalId);
    if (!arrival) {
      throw new AppError(ErrorCode.NOT_FOUND, `Arrival ${arrivalId} not found`);
    }

    if (arrival.is_received) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Arrival ${arrivalId} is already marked as received`
      );
    }

    await this.expectedRepo.receiveArrival(arrivalId, adminUserId);

    await this.auditLogRepo.insert({
      adminId: adminUserId,
      action: 'MARK_ARRIVAL_RECEIVED',
      entityType: 'EXPECTED_STOCK',
      entityId: arrivalId,
      beforeJson: { is_received: false },
      afterJson: { is_received: true, received_at: new Date() },
    });

    logger.info(`Arrival ${arrivalId} marked as received by ${adminUserId}`);

    // Check if replenished stock triggers events
    const updatedVariant = await this.invRepo.getVariant(arrival.variant_id);
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
            `[InventoryService] Failed to enqueue ${name} after ${maxRetries} attempts`,
            error
          );
          // Optionally alert or throw, but for now log error
          return;
        }
        // Exponential backoff: 100ms, 200ms, 400ms
        const delay = 100 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
