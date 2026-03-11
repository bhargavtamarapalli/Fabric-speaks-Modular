import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PincodeService } from '../../src/services/pincode.service';
import { PincodeRepository } from '../../src/repositories/pincode.repository';
import { Redis } from 'ioredis';

describe('PincodeService - Serviceability and COD Checks', () => {
    let service: PincodeService;
    let mockRepo: any;
    let mockRedis: any;

    beforeEach(() => {
        mockRepo = {
            getPincode: vi.fn(),
            bulkUpsert: vi.fn()
        };
        mockRedis = {
            get: vi.fn(),
            setex: vi.fn()
        };

        service = new PincodeService(
            mockRepo as unknown as PincodeRepository,
            mockRedis as unknown as Redis
        );
    });

    it('should return cached serviceability if available in Redis', async () => {
        const cachedPincode = {
            pincode: '110001',
            deliverable: true,
            cod_available: true,
            estimated_days: 3,
            partner: 'Shiprocket'
        };

        mockRedis.get.mockResolvedValue(JSON.stringify(cachedPincode));

        const result = await service.getServiceability('110001');

        expect(mockRedis.get).toHaveBeenCalledWith('pin:110001');
        expect(mockRepo.getPincode).not.toHaveBeenCalled();
        expect(result.cod_available).toBe(true);
    });

    it('should fetch from DB if not in Redis and update cache', async () => {
        mockRedis.get.mockResolvedValue(null);

        const dbRecord = {
            pincode: '400001',
            deliverable: true,
            cod_available: false,
            estimated_days: 4,
            partner: 'Shiprocket'
        };

        mockRepo.getPincode.mockResolvedValue(dbRecord);

        const result = await service.getServiceability('400001');

        expect(mockRedis.get).toHaveBeenCalledWith('pin:400001');
        expect(mockRepo.getPincode).toHaveBeenCalledWith('400001');
        expect(mockRedis.setex).toHaveBeenCalledWith('pin:400001', 86400, JSON.stringify(dbRecord));
        expect(result.cod_available).toBe(false);
    });

    it('should return unserviceable default and cache it if pincode genuinely does not exist', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRepo.getPincode.mockResolvedValue(null);

        const result = await service.getServiceability('999999');

        expect(result.deliverable).toBe(false);
        expect(result.cod_available).toBe(false);
        
        // ensure negative lookup is cached
        expect(mockRedis.setex).toHaveBeenCalled();
    });
});
