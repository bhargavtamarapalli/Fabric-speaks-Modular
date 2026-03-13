import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PincodeService } from '../../src/services/pincode.service';
import { PincodeRepository } from '../../src/repositories/pincode.repository';
import { Redis } from 'ioredis';
import { AppError, ErrorCode } from '@fs/shared/errors';

describe('PincodeService - Bulk Upload', () => {
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

    it('should parse valid CSV data and upsert to DB', async () => {
        const csvData = `pincode,deliverable,cod_available,estimated_days,partner
110001,true,true,3,Shiprocket
400001,true,false,4,BlueDart`;

        const response = await service.processBulkUpload(csvData);

        expect(response.processed).toBe(2);
        expect(response.errors.length).toBe(0);
        expect(mockRepo.bulkUpsert).toHaveBeenCalledWith([
            { pincode: '110001', deliverable: true, codAvailable: true, estimatedDays: 3, partner: 'Shiprocket' },
            { pincode: '400001', deliverable: true, codAvailable: false, estimatedDays: 4, partner: 'BlueDart' },
        ]);
    });

    it('should throw an error for malformed CSV structure', async () => {
        const badCsvData = `"pincode","unclosed_quote
123456`;
        
        await expect(service.processBulkUpload(badCsvData))
            .rejects.toThrowError(AppError); // Expecting INVALID_CSV AppError
    });

    it('should collect errors for rows with missing data but still process valid rows', async () => {
        const csvData = `pincode,deliverable,cod_available,estimated_days,partner
110001,true,true,3,
,true,false,4,Shiprocket
560001,false,false,5,`;
        
        const response = await service.processBulkUpload(csvData);

        expect(response.processed).toBe(2);
        expect(response.errors.length).toBe(1);
        expect(response.errors[0]).toContain('Row 3: Missing pincode');
    });

    it('should fall back to defaults for missing optional fields', async () => {
        const csvData = `pincode
110001`; // only pincode header and value

        const response = await service.processBulkUpload(csvData);
        expect(response.processed).toBe(1);
        expect(mockRepo.bulkUpsert).toHaveBeenCalledWith([{
            pincode: '110001',
            deliverable: true, // default fallback
            codAvailable: false, // default fallback
            estimatedDays: 5, // default fallback
            partner: 'Shiprocket' // default fallback
        }]);
    });
});
