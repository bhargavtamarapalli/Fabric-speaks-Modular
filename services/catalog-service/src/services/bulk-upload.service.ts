import { Queue } from 'bullmq';
import { AppError, ErrorCode } from '@fs/shared/errors';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { BulkUploadSchema } from '../schemas/catalog.schemas';

export class BulkUploadService {
    constructor(
        private readonly bulkUploadQueue: Queue,
        private readonly auditLogRepo: AuditLogRepository
    ) {}

    async queueUpload(csvData: string, adminId: string): Promise<{ jobId?: string; errors?: any[] }> {
        const lines = csvData.split('\n').map(l => l.trim()).filter(l => l !== '');
        if (lines.length === 0) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Empty CSV file');

        const headers = lines[0]?.split(',').map(h => h.trim()) || [];
        const dataRows = lines.slice(1);
        
        if (dataRows.length > 500) {
            throw new AppError(ErrorCode.BULK_UPLOAD_LIMIT, 'Max 500 rows allowed per upload');
        }

        const parsedData: any[] = [];
        const validationErrors: any[] = [];

        dataRows.forEach((line, index) => {
            const values = line.split(',');
            const rowData: any = {};
            headers.forEach((header, i) => {
                const val = values[i] || '';
                // Simple type conversion for price and qty
                if (header === 'base_price' || header === 'qty' || header === 'gsm_weight') {
                    rowData[header] = val === '' ? undefined : Number(val);
                } else {
                    rowData[header] = val;
                }
            });

            const result = BulkUploadSchema.element.safeParse(rowData);
            if (!result.success) {
                result.error.errors.forEach((err: any) => {
                    validationErrors.push({
                        row: index + 2, // 1-indexed + header
                        field: err.path[0],
                        value: rowData[err.path[0]],
                        message: err.message
                    });
                });
            } else {
                parsedData.push(result.data);
            }
        });

        if (validationErrors.length > 0) {
            return { errors: validationErrors };
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
            afterJson: { rowCount: dataRows.length }
        });

        return { jobId: job.id || '' };
    }

    // Template generation logic
    getTemplateCsv(): string {
        return 'name,sku,size,colour,base_price,qty,fabric_type,gsm_weight,weave_type,breathability_rating,care_instructions,fabric_origin\n';
    }
}
