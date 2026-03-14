import { Queue } from 'bullmq';
import { VariantRepository } from '../repositories/variant.repository';
import { logger } from '@fs/shared/logger';

export class VariantService {
    constructor(
        private readonly variantRepo: VariantRepository,
        private readonly notificationQueue: Queue
    ) {}

    async updateStock(variantId: string, newQty: number): Promise<void> {
        const before = await this.variantRepo.findById(variantId);
        const oldQty = before ? before.qty : 0;
        
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
