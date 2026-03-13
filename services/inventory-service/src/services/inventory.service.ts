import { InventoryRepository, VariantStock } from '../repositories/inventory.repository';
import { ExpectedStockRepository, ExpectedStock } from '../repositories/expected-stock.repository';
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
    private expectedRepo: ExpectedStockRepository
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
    if (newQty < 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Stock quantity cannot be negative');
    }
    if (!reason || reason.trim() === '') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Reason is required for manual adjustment');
    }
    
    try {
      const updated = await this.invRepo.adjustStock(variantId, newQty, reason, adminUserId);
      logger.info(`Stock adjusted for variant ${variantId} to ${newQty} by ${adminUserId}`);
      return updated;
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('not found')) {
        throw new AppError(ErrorCode.NOT_FOUND, `Variant ${variantId} not found`);
      }
      throw error;
    }
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
              if (!row.variant_id || !row.new_qty || !row.reason) {
                throw new Error('Missing required fields (variant_id, new_qty, reason)');
              }

              const qty = parseInt(row.new_qty, 10);
              if (isNaN(qty) || qty < 0) {
                throw new Error('Invalid quantity');
              }

              await this.invRepo.adjustStock(row.variant_id, qty, row.reason, adminUserId);
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

  async addExpectedArrival(data: Omit<ExpectedStock, 'id' | 'status'>): Promise<ExpectedStock> {
    if (data.expected_qty <= 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Expected quantity must be greater than zero');
    }
    // Also validate the variant exists before allowing this
    const variant = await this.invRepo.getVariant(data.variant_id);
    if (!variant) {
      throw new AppError(ErrorCode.NOT_FOUND, `Variant ${data.variant_id} not found`);
    }

    return this.expectedRepo.addExpectedStock(data);
  }

  async getExpectedArrivals(): Promise<ExpectedStock[]> {
    return this.expectedRepo.getPendingArrivals();
  }

  async getStockHealth(): Promise<{ status: string; count: number }[]> {
    return this.invRepo.getHealthSummary();
  }
}
