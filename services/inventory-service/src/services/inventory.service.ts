import { InventoryRepository, VariantStock } from '../repositories/inventory.repository';
import { ExpectedStockRepository, ExpectedStock } from '../repositories/expected-stock.repository';
import { AppError, ErrorCode, logger } from '@fs/shared';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

export class InventoryService {
  private invRepo: InventoryRepository;
  private expectedRepo: ExpectedStockRepository;

  constructor() {
    this.invRepo = new InventoryRepository();
    this.expectedRepo = new ExpectedStockRepository();
  }

  async listInventory(sortBy: 'asc' | 'desc' = 'asc'): Promise<VariantStock[]> {
    return this.invRepo.getAllVariants(sortBy);
  }

  async manualAdjustment(variantId: string, newQty: number, reason: string, adminUserId: string): Promise<VariantStock> {
    if (newQty < 0) {
      throw new AppError('Stock quantity cannot be negative', 400, ErrorCode.VALIDATION_ERROR);
    }
    if (!reason || reason.trim() === '') {
      throw new AppError('Reason is required for manual adjustment', 400, ErrorCode.VALIDATION_ERROR);
    }
    
    try {
      const updated = await this.invRepo.adjustStock(variantId, newQty, reason, adminUserId);
      logger.info(`Stock adjusted for variant ${variantId} to ${newQty} by ${adminUserId}`);
      return updated;
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new AppError(`Variant ${variantId} not found`, 404, ErrorCode.NOT_FOUND);
      }
      throw error;
    }
  }

  async bulkAdjustment(csvBuffer: Buffer, adminUserId: string): Promise<{ success: number; failed: number; errors: any[] }> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const errors: any[] = [];
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
            } catch (err: any) {
              failedCount++;
              errors.push({ row, error: err.message });
            }
          }
          
          logger.info(`Bulk adjustment complete: ${successCount} success, ${failedCount} failed`);
          resolve({ success: successCount, failed: failedCount, errors });
        })
        .on('error', (err) => {
          reject(new AppError('Failed to parse CSV', 400, ErrorCode.VALIDATION_ERROR));
        });
    });
  }

  async addExpectedArrival(data: Omit<ExpectedStock, 'id' | 'status'>): Promise<ExpectedStock> {
    if (data.expected_qty <= 0) {
      throw new AppError('Expected quantity must be greater than zero', 400, ErrorCode.VALIDATION_ERROR);
    }
    // Also validate the variant exists before allowing this
    const variant = await this.invRepo.getVariant(data.variant_id);
    if (!variant) {
      throw new AppError(`Variant ${data.variant_id} not found`, 404, ErrorCode.NOT_FOUND);
    }

    return this.expectedRepo.addExpectedStock(data);
  }

  async getExpectedArrivals(): Promise<ExpectedStock[]> {
    return this.expectedRepo.getPendingArrivals();
  }

  async getStockHealth(): Promise<{ status: string; count: number }[]> {
    return this.invRepo.getHealthSummary();
  }

  static calculateHealthStatus(stockQty: number): string {
    if (stockQty <= 0) return 'CRITICAL';
    if (stockQty < 5) return 'WARNING';
    return 'HEALTHY';
  }
}
