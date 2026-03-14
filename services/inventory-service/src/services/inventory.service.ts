import { InventoryRepository, VariantStock } from '../repositories/inventory.repository';
import { ExpectedStockRepository, ExpectedStock } from '../repositories/expected-stock.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { BulkAdjustmentRowSchema } from '../schemas/inventory.schemas';
import { AppError, ErrorCode, logger } from '@fs/shared';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

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
  constructor(
    private invRepo: InventoryRepository,
    private expectedRepo: ExpectedStockRepository,
    private auditLogRepo: AuditLogRepository
  ) {}

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

  async addExpectedArrival(data: Omit<ExpectedStock, 'id' | 'status'>, adminUserId: string): Promise<ExpectedStock> {
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

  async getExpectedArrivals(): Promise<ExpectedStock[]> {
    return this.expectedRepo.getPendingArrivals();
  }

  async getStockHealth(): Promise<{ status: string; count: number }[]> {
    return this.invRepo.getHealthSummary();
  }
}
