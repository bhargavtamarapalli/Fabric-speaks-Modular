import { InventoryRepository, VariantStock } from '../repositories/inventory.repository';
import { ExpectedStockRepository, ExpectedStock } from '../repositories/expected-stock.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { BulkAdjustmentRowSchema } from '../schemas/inventory.schemas';
import { AppError, ErrorCode, logger, getRedisClient } from '@fs/shared';
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

  public static calculateHealthStatus(qty: number): 'CRITICAL' | 'WARNING' | 'HEALTHY' {
    if (qty <= 0) return 'CRITICAL';
    if (qty < 5) return 'WARNING';
    return 'HEALTHY';
  }

  async listInventory(sortBy: 'asc' | 'desc' = 'asc'): Promise<VariantStock[]> {
    return this.invRepo.getAllVariants(sortBy);
  }

  async manualAdjustment(variantId: string, newQty: number, reason: string, adminUserId: string): Promise<VariantStock> {
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
      afterJson: { stockQty: updated.stockQty, reason }
    });

    logger.info(`Stock adjusted for variant ${variantId} to ${newQty} by ${adminUserId}`);
    
    if (updated.stockQty < updated.thresholdQty) {
      await this.eventQueue.add('stock.low', {
        variantId: updated.variantId,
        productName: updated.productName,
        stockCount: updated.stockQty,
        threshold: updated.thresholdQty
      });
    }

    return updated;
  }

  async bulkAdjustment(csvBuffer: Buffer, adminUserId: string): Promise<BulkAdjustmentResponse> {
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
              // Validate row with Zod
              const validated = BulkAdjustmentRowSchema.parse(row);

              const currentVariant = await this.invRepo.getVariant(validated.variant_id);
              if (!currentVariant) {
                throw new Error(`Variant ${validated.variant_id} not found`);
              }

              const updated = await this.invRepo.adjustStock(validated.variant_id, validated.new_qty, validated.reason, adminUserId);
              
              await this.auditLogRepo.insert({
                adminId: adminUserId,
                action: 'BULK_STOCK_ADJUSTMENT',
                entityType: 'INVENTORY',
                entityId: validated.variant_id,
                beforeJson: { stockQty: currentVariant.stockQty },
                afterJson: { stockQty: updated.stockQty, reason: validated.reason }
              });

              if (updated.stockQty < updated.thresholdQty) {
                await this.eventQueue.add('stock.low', {
                  variantId: updated.variantId,
                  productName: updated.productName,
                  stockCount: updated.stockQty,
                  threshold: updated.thresholdQty
                });
              }

              successCount++;
            } catch (err) {
              failedCount++;
              errors.push({ row, error: (err as Error).message });
            }
          }
          
          logger.info(`Bulk adjustment complete: ${successCount} success, ${failedCount} failed`);
          resolve({ success: successCount, failed: failedCount, errors });
        })
        .on('error', (err) => {
          reject(new AppError(ErrorCode.VALIDATION_ERROR, 'Failed to parse CSV'));
        });
    });
  }

  async addExpectedArrival(data: Omit<ExpectedStock, 'id' | 'is_received' | 'received_at'>, adminUserId: string): Promise<ExpectedStock> {
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
      afterJson: arrival
    });

    return arrival;
  }

  async markArrivalReceived(arrivalId: string, adminUserId: string): Promise<void> {
    const arrival = await this.expectedRepo.getById(arrivalId);
    if (!arrival) {
      throw new AppError(ErrorCode.NOT_FOUND, `Arrival ${arrivalId} not found`);
    }

    if (arrival.is_received) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `Arrival ${arrivalId} is already marked as received`);
    }

    await this.expectedRepo.receiveArrival(arrivalId, adminUserId);

    await this.auditLogRepo.insert({
      adminId: adminUserId,
      action: 'MARK_ARRIVAL_RECEIVED',
      entityType: 'EXPECTED_STOCK',
      entityId: arrivalId,
      beforeJson: { is_received: false },
      afterJson: { is_received: true, received_at: new Date() }
    });

    logger.info(`Arrival ${arrivalId} marked as received by ${adminUserId}`);
    
    // Check if replenished stock triggers events
    const updatedVariant = await this.invRepo.getVariant(arrival.variant_id);
    if (updatedVariant && updatedVariant.stockQty > 0) {
       await this.eventQueue.add('stock.replenished', {
          variantId: updatedVariant.variantId,
          productName: updatedVariant.productName,
          stockCount: updatedVariant.stockQty
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
      afterJson: { thresholdQty: threshold }
    });

    logger.info(`Stock threshold updated for variant ${variantId} to ${threshold} by ${adminUserId}`);
  }

  async getExpectedArrivals(): Promise<ExpectedStock[]> {
    return this.expectedRepo.getPendingArrivals();
  }

  async getStockHealth(): Promise<{ status: string; count: number }[]> {
    return this.invRepo.getHealthSummary();
  }
}
