import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VariantService } from '../../src/services/variant.service';
import { Queue } from 'bullmq';

describe('VariantService', () => {
    let service: VariantService;
    let mockVariantRepo: any;
    let mockNotificationQueue: any;

    beforeEach(() => {
        mockVariantRepo = {
            findById: vi.fn(),
            updateStock: vi.fn().mockResolvedValue(undefined)
        };

        mockNotificationQueue = {
            add: vi.fn().mockResolvedValue({ id: 'job-1' })
        };

        service = new VariantService(mockVariantRepo, mockNotificationQueue);
        vi.clearAllMocks();
    });

    it('should emit stock.low when qty drops from 10 to 4', async () => {
        mockVariantRepo.findById.mockImplementation(async () => ({ id: 'v1', qty: 10 }));
        
        await service.updateStock('v1', 4);
        
        expect(mockVariantRepo.updateStock).toHaveBeenCalledWith('v1', 4);
        expect(mockNotificationQueue.add).toHaveBeenCalledWith('stock.low', {
            variantId: 'v1',
            qty: 4
        });
    });

    it('should NOT emit stock.low when qty drops from 4 to 2 (already low)', async () => {
        mockVariantRepo.findById.mockImplementation(async () => ({ id: 'v1', qty: 4 }));
        
        await service.updateStock('v1', 2);
        
        expect(mockVariantRepo.updateStock).toHaveBeenCalledWith('v1', 2);
        expect(mockNotificationQueue.add).not.toHaveBeenCalled();
    });

    it('should NOT emit stock.low when qty stays >= 5', async () => {
        mockVariantRepo.findById.mockImplementation(async () => ({ id: 'v1', qty: 10 }));
        
        await service.updateStock('v1', 6);
        
        expect(mockVariantRepo.updateStock).toHaveBeenCalledWith('v1', 6);
        expect(mockNotificationQueue.add).not.toHaveBeenCalled();
    });

    it('should throw error if variant not found', async () => {
        mockVariantRepo.findById.mockImplementation(async () => null);
        
        await expect(service.updateStock('v999', 10)).rejects.toThrow('Variant v999 not found');
    });
});
