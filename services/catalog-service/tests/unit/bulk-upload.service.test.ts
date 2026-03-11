import { describe, it, expect, vi } from 'vitest';
import { BulkUploadService } from '../../src/services/bulk-upload.service';
import { Queue } from 'bullmq';
import { AuditLogRepository } from '../../src/repositories/audit_log.repository';

// Mock dependencies
const mockQueue = {
    add: vi.fn().mockResolvedValue({ id: 'job-123' })
} as unknown as Queue;

const mockAuditLogRepo = {
    insert: vi.fn().mockResolvedValue(undefined)
} as unknown as AuditLogRepository;

describe('BulkUploadService', () => {
    let service: BulkUploadService;

    beforeEach(() => {
        service = new BulkUploadService(mockQueue, mockAuditLogRepo);
        vi.clearAllMocks();
    });

    it('should successfully queue a valid CSV upload', async () => {
        // 1 header + 2 data rows = 3 rows total
        const validCsv = `name,sku,base_price,qty
Shirt 1,SKU-001,499,10
Shirt 2,SKU-002,599,20`;
        
        const result = await service.queueUpload(validCsv, 'admin-uuid-123');
        
        expect(result.jobId).toBe('job-123');
        expect(mockQueue.add).toHaveBeenCalledWith('bulk-product-upload', {
            csvData: validCsv,
            adminId: 'admin-uuid-123'
        });
        expect(mockAuditLogRepo.insert).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if CSV exceeds 500 rows limit', async () => {
        // Create 502 lines (1 header + 501 data)
        const header = 'name,sku,base_price,qty\n';
        const rows = Array(501).fill('Shirt,SKU,499,10').join('\n');
        const largeCsv = header + rows;

        await expect(service.queueUpload(largeCsv, 'admin-uuid-123')).rejects.toThrow('Max 500 rows allowed per upload');
        expect(mockQueue.add).not.toHaveBeenCalled();
    });
});
