import { PincodeRepository, PincodeRecord } from '../repositories/pincode.repository';
import { Redis } from 'ioredis';
import { AppError, ErrorCode } from '@fs/shared/errors';
import Papa from 'papaparse';

export class PincodeService {
    private readonly REDIS_PREFIX = 'pin:';
    private readonly TTL_SECONDS = 24 * 60 * 60; // 24 hours

    constructor(
        private readonly pincodeRepo: PincodeRepository,
        private readonly redis: Redis
    ) {}

    async getServiceability(pincode: string): Promise<PincodeRecord> {
        const key = `${this.REDIS_PREFIX}${pincode}`;
        
        // 1. Check Redis cache
        const cached = await this.redis.get(key);
        if (cached) {
            return JSON.parse(cached) as PincodeRecord;
        }

        // 2. Fallback to DB
        const record = await this.pincodeRepo.getPincode(pincode);
        if (!record) {
            // Unserviceable default
            const unserviceable: PincodeRecord = {
                pincode,
                deliverable: false,
                cod_available: false,
                estimated_days: 0,
                partner: 'None'
            };
            // Cache negative lookup to prevent DB hammering
            await this.redis.setex(key, this.TTL_SECONDS, JSON.stringify(unserviceable));
            return unserviceable;
        }

        // 3. Cache and return
        await this.redis.setex(key, this.TTL_SECONDS, JSON.stringify(record));
        return record;
    }

    async processBulkUpload(csvString: string): Promise<{ processed: number; errors: string[] }> {
        const parsed = Papa.parse(csvString, {
            header: true,
            skipEmptyLines: true,
        });

        // Filter out UndetectableDelimiter because it defaults to comma and works fine for single-column
        const criticalErrors = parsed.errors.filter(e => e.code !== 'UndetectableDelimiter');

        if (criticalErrors.length > 0) {
            throw new AppError(ErrorCode.INVALID_CSV, 'CSV parsing failed', { errors: criticalErrors });
        }

        const rows = parsed.data as any[];
        if (rows.length > 5000) {
           throw new AppError(ErrorCode.BULK_UPLOAD_LIMIT, 'Max 5000 rows allowed for pincode upload');
        }

        const records: PincodeRecord[] = [];
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                if (!row.pincode) throw new Error('Missing pincode');

                records.push({
                    pincode: String(row.pincode).trim(),
                    deliverable: row.deliverable ? String(row.deliverable).toLowerCase() === 'true' : true,
                    cod_available: row.cod_available ? String(row.cod_available).toLowerCase() === 'true' : false,
                    estimated_days: row.estimated_days ? parseInt(row.estimated_days, 10) : 5,
                    partner: row.partner ? String(row.partner).trim() : 'Shiprocket'
                });
            } catch (err: any) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }

        if (records.length > 0) {
            await this.pincodeRepo.bulkUpsert(records);
        }

        return { processed: records.length, errors };
    }
}
