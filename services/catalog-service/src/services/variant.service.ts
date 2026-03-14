import { Queue } from 'bullmq';
import { VariantRepository } from '../repositories/variant.repository';
import { logger } from '@fs/shared/logger';
import { AppError, ErrorCode } from '@fs/shared/errors';

export class VariantService {
    constructor(
        private readonly variantRepo: VariantRepository,
        private readonly notificationQueue: Queue
    ) {}

    async updateStock(variantId: string, newQty: number): Promise<void> {
        const before = await this.variantRepo.findById(variantId);
        if (!before) {
            throw new AppError(ErrorCode.NOT_FOUND, `Variant ${variantId} not found`);
        }
        const oldQty = before.qty;
        
        await this.variantRepo.updateStock(variantId, newQty);
        
        if (oldQty >= 5 && newQty < 5) {
            logger.warn(`Low stock alert for variant ${variantId}: ${newQty} remaining`);
            await this.notificationQueue.add('stock.low', {
                variantId,
                qty: newQty
            });
        }
    }
}
