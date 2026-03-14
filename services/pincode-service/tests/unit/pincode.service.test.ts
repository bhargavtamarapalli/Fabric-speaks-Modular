import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PincodeService } from '../../src/services/pincode.service';
import { PincodeRepository } from '../../src/repositories/pincode.repository';
import { AuditLogRepository } from '../../src/repositories/audit-log.repository';
import { Redis } from 'ioredis';
import { PINCODE_CONSTANTS } from '../../src/config/constants';

describe('PincodeService - Serviceability and COD Checks', () => {
    let service: PincodeService;
    let mockRepo: any;
    let mockRedis: any;
    let mockAuditLogRepo: any;

    beforeEach(() => {
        mockRepo = {
            getPincode: vi.fn(),
            bulkUpsert: vi.fn().mockResolvedValue(undefined)
        };
        mockRedis = {
            get: vi.fn(),
            setex: vi.fn().mockResolvedValue('OK'),
            del: vi.fn().mockResolvedValue(1)
        };
        mockAuditLogRepo = {
            insert: vi.fn().mockResolvedValue(undefined)
        };

        service = new PincodeService(
            mockRepo as unknown as PincodeRepository,
            mockRedis as unknown as Redis,
            mockAuditLogRepo as unknown as AuditLogRepository
        );
    });

    it('should return cached serviceability if available in Redis', async () => {
        const cachedPincode = {
            pincode: '110001',
            deliverable: true,
            codAvailable: true,
            estimatedDays: 3,
            partner: 'Shiprocket'
        };

        mockRedis.get.mockResolvedValue(JSON.stringify(cachedPincode));

        const result = await service.getServiceability('110001');

        expect(mockRedis.get).toHaveBeenCalledWith(`${PINCODE_CONSTANTS.REDIS_PREFIX}110001`);
        expect(mockRepo.getPincode).not.toHaveBeenCalled();
        expect(result.codAvailable).toBe(true);
    });

    it('should fetch from DB if not in Redis and update cache', async () => {
        mockRedis.get.mockResolvedValue(null);

        const dbRecord = {
            pincode: '400001',
            deliverable: true,
            codAvailable: false,
            estimatedDays: 4,
            partner: 'Shiprocket'
        };

        mockRepo.getPincode.mockResolvedValue(dbRecord);

        const result = await service.getServiceability('400001');

        expect(mockRedis.get).toHaveBeenCalledWith(`${PINCODE_CONSTANTS.REDIS_PREFIX}400001`);
        expect(mockRepo.getPincode).toHaveBeenCalledWith('400001');
        expect(mockRedis.setex).toHaveBeenCalledWith(`${PINCODE_CONSTANTS.REDIS_PREFIX}400001`, PINCODE_CONSTANTS.CACHE_TTL_SECONDS, JSON.stringify(dbRecord));
        expect(result.codAvailable).toBe(false);
    });

    it('should handle Redis failure gracefully and fall back to DB', async () => {
        mockRedis.get.mockRejectedValue(new Error('Redis Down'));
        const dbRecord = {
            pincode: '400001',
            deliverable: true,
            codAvailable: false,
            estimatedDays: 4,
            partner: 'Shiprocket'
        };
        mockRepo.getPincode.mockResolvedValue(dbRecord);

        const result = await service.getServiceability('400001');

        expect(result.pincode).toBe('400001');
        expect(mockRepo.getPincode).toHaveBeenCalled();
    });

    it('should handle corrupted cache by clearing it and falling back to DB', async () => {
        mockRedis.get.mockResolvedValue('invalid-json');
        mockRedis.del.mockResolvedValue(1);
        const dbRecord = {
            pincode: '400001',
            deliverable: true,
            codAvailable: false,
            estimatedDays: 4,
            partner: 'Shiprocket'
        };
        mockRepo.getPincode.mockResolvedValue(dbRecord);

        const result = await service.getServiceability('400001');

        expect(mockRedis.del).toHaveBeenCalled();
        expect(mockRepo.getPincode).toHaveBeenCalled();
        expect(result.pincode).toBe('400001');
    });

    it('should return unserviceable default and cache it if pincode genuinely does not exist', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRepo.getPincode.mockResolvedValue(null);

        const result = await service.getServiceability('999999');

        expect(result.deliverable).toBe(false);
        expect(result.codAvailable).toBe(false);
        expect(mockRedis.setex).toHaveBeenCalled();
    });
});
