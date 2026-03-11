import { Queue } from 'bullmq';
import { AppError, ErrorCode } from '@fs/shared/errors';
import { AuditLogRepository } from '../repositories/audit_log.repository';

export class BulkUploadService {
    constructor(
        private readonly bulkUploadQueue: Queue,
        private readonly auditLogRepo: AuditLogRepository
    ) {}

    async queueUpload(csvData: string, adminId: string): Promise<{ jobId: string }> {
        const rows = csvData.split('\n').filter(line => line.trim() !== '');
        
        if (rows.length > 501) { // 500 rows + 1 header
            throw new AppError(ErrorCode.BULK_UPLOAD_LIMIT, 'Max 500 rows allowed per upload');
        }

        const job = await this.bulkUploadQueue.add('bulk-product-upload', {
            csvData,
            adminId
        });

        await this.auditLogRepo.insert({
            adminId,
            action: 'product.bulk_upload_queued',
            entityType: 'bulk_upload',
            entityId: job.id || 'unknown',
            afterJson: { rowCount: rows.length - 1 }
        });

        return { jobId: job.id || '' };
    }

    // Template generation logic
    getTemplateCsv(): string {
        return 'name,sku,size,colour,base_price,qty,fabric_type,gsm_weight,weave_type,breathability_rating,care_instructions,fabric_origin\n';
    }
}
