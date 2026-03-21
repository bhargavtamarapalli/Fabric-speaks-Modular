import { Queue } from 'bullmq';
import { AppError, ErrorCode } from '@fs/shared/errors';
import { AuditLogRepository } from '../repositories/audit_log.repository';
import { BulkUploadSchema } from '../schemas/catalog.schemas';

export class BulkUploadService {
    constructor(
        private readonly bulkUploadQueue: Queue,
        private readonly auditLogRepo: AuditLogRepository
    ) {}

    async queueUpload(csvData: string, adminId: string): Promise<{ success: number; failed: number; errors?: any[]; jobId: string | null }> {
        const lines = csvData.split('\n').map(l => l.trim()).filter(l => l !== '');
        if (lines.length === 0) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Empty CSV file');

        const headers = this.parseCSVLine(lines[0] || '');
        const dataRows = lines.slice(1);
        
        if (dataRows.length > 500) {
            throw new AppError(ErrorCode.BULK_UPLOAD_LIMIT, 'Max 500 rows allowed per upload');
        }

        const validationErrors: any[] = [];
        const parsedRows: any[] = [];

        dataRows.forEach((line, index) => {
            const values = this.parseCSVLine(line);
            const rowData: any = {};
            
            headers.forEach((header, i) => {
                const val = values[i]?.trim() || '';
                // Simple numeric conversion for known fields
                if (['base_price', 'qty', 'gsm_weight'].includes(header)) {
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
                        value: rowData[err.path[0] as string],
                        message: err.message
                    });
                });
            } else {
                parsedRows.push(result.data);
            }
        });

        if (validationErrors.length > 0) {
            return { 
                success: parsedRows.length, 
                failed: validationErrors.length, 
                errors: validationErrors, 
                jobId: null 
            };
        }

        // Audit log BEFORE queueing to ensure consistency
        await this.auditLogRepo.insert({
            adminId,
            action: 'PRODUCT_BULK_UPLOAD_QUEUED',
            entityType: 'PRODUCT',
            entityId: 'BULK',
            beforeJson: null,
            afterJson: { rowCount: parsedRows.length, products: parsedRows.map(p => ({ sku: p.sku, name: p.name })) }
        });

        // Pass VALIDATED rows to job instead of raw CSV
        const job = await this.bulkUploadQueue.add('bulk-product-upload', {
            products: parsedRows,
            adminId
        });

        return { 
            success: parsedRows.length, 
            failed: 0, 
            jobId: job.id as string
        };
    }

    private parseCSVLine(line: string): string[] {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(cur);
                cur = '';
            } else {
                cur += char;
            }
        }
        result.push(cur);
        return result;
    }

    // Template generation logic
    getTemplateCsv(): string {
        return 'name,sku,size,colour,base_price,qty,fabric_type,gsm_weight,weave_type,breathability_rating,care_instructions,fabric_origin\n';
    }
}
