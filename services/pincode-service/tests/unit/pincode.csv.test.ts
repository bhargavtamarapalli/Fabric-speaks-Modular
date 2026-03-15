import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PincodeService } from '../../src/services/pincode.service';
import { PincodeRepository } from '../../src/repositories/pincode.repository';
import { AuditLogRepository } from '../../src/repositories/audit-log.repository';
import { Redis } from 'ioredis';
import { AppError, ErrorCode } from '@fs/shared';
import { PINCODE_CONSTANTS } from '../../src/config/constants';

describe('PincodeService - Bulk Upload', () => {
    let service: PincodeService;
    let mockRepo: any;
    let mockRedis: any;
    let mockAuditLogRepo: any;
    const adminId = 'admin-123';

    beforeEach(() => {
        mockRepo = {
            getPincode: vi.fn(),
            bulkUpsert: vi.fn().mockResolvedValue(undefined)
        };
        mockRedis = {
            get: vi.fn(),
            setex: vi.fn().mockResolvedValue('OK')
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

    it('should parse valid CSV data and upsert to DB and audit log', async () => {
        const csvData = `pincode,deliverable,cod_available,estimated_days,partner
110001,true,true,3,Shiprocket
400001,true,false,4,BlueDart`;

        const response = await service.processBulkUpload(csvData, adminId);

        expect(response.processed).toBe(2);
        expect(response.errors.length).toBe(0);
        expect(mockRepo.bulkUpsert).toHaveBeenCalled();
        expect(mockAuditLogRepo.insert).toHaveBeenCalledWith(expect.objectContaining({
            adminId,
            action: 'BULK_UPLOAD',
            entityType: 'pincode'
        }));
    });

    it('should throw ErrorCode.BULK_UPLOAD_LIMIT if rows exceed limit', async () => {
        const manyRows = 'pincode\n' + Array(5001).fill('110001').join('\n');
        await expect(service.processBulkUpload(manyRows, adminId))
            .rejects.toThrowError(expect.objectContaining({ code: ErrorCode.BULK_UPLOAD_LIMIT }));
    });

    it('should collect errors for invalid pincode format', async () => {
        const csvData = `pincode\n12345\n1234567\nabcdef`;
        const response = await service.processBulkUpload(csvData, adminId);
        expect(response.processed).toBe(0);
        expect(response.errors.length).toBe(3);
        expect(response.errors[0]).toContain('Pincode must be exactly 6 digits');
    });

    it('should collect errors for invalid partner', async () => {
        const csvData = `pincode,partner\n110001,InvalidPartner`;
        const response = await service.processBulkUpload(csvData, adminId);
        expect(response.processed).toBe(0);
        expect(response.errors[0]).toContain('Invalid partner');
    });

    it('should collect errors for out-of-range estimated_days', async () => {
        const csvData = `pincode,estimated_days\n110001,0\n400001,31`;
        const response = await service.processBulkUpload(csvData, adminId);
        expect(response.processed).toBe(0);
        expect(response.errors.length).toBe(2);
        expect(response.errors[0]).toContain('estimated_days must be between');
    });

    it('should fall back to defaults for missing optional fields', async () => {
        const csvData = `pincode\n110001`;

        const response = await service.processBulkUpload(csvData, adminId);
        expect(response.processed).toBe(1);
        expect(mockRepo.bulkUpsert).toHaveBeenCalledWith([{
            pincode: '110001',
            deliverable: true,
            codAvailable: false,
            estimatedDays: PINCODE_CONSTANTS.DEFAULT_ESTIMATED_DAYS,
            partner: PINCODE_CONSTANTS.DEFAULT_PARTNER
        }]);
    });
});
