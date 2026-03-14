import { PincodeRepository, PincodeRecord } from '../repositories/pincode.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { Redis } from 'ioredis';
import { AppError, ErrorCode, logger } from '@fs/shared';
import { PINCODE_CONSTANTS } from '../config/constants';
import Papa from 'papaparse';

interface CSVRow {
    pincode: string;
    deliverable?: string;
    cod_available?: string;
    estimated_days?: string;
    partner?: string;
}

export class PincodeService {
    constructor(
        private readonly pincodeRepo: PincodeRepository,
        private readonly redis: Redis,
        private readonly auditLogRepo: AuditLogRepository
    ) {}

    async getServiceability(pincode: string): Promise<PincodeRecord> {
        const key = `${PINCODE_CONSTANTS.REDIS_PREFIX}${pincode}`;
        
        // 1. Check Redis cache with fallback
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                try {
                    return JSON.parse(cached) as PincodeRecord;
                } catch (parseError) {
                    logger.error(`Cache corruption for key ${key}: ${parseError}`);
                    await this.redis.del(key).catch(() => {}); // Attempt to clear corrupted cache
                }
            }
        } catch (redisError) {
            logger.error(`Redis failure during getServiceability for ${pincode}: ${redisError}`);
            // Fall through to DB
        }

        // 2. Fallback to DB
        const record = await this.pincodeRepo.getPincode(pincode);
        if (!record) {
            // Unserviceable default
            const unserviceable: PincodeRecord = {
                pincode,
                deliverable: false,
                codAvailable: false,
                estimatedDays: 0,
                partner: 'None'
            };
            // Cache negative lookup to prevent DB hammering
            await this.redis.setex(key, PINCODE_CONSTANTS.CACHE_TTL_SECONDS, JSON.stringify(unserviceable)).catch(() => {});
            return unserviceable;
        }

        // 3. Cache and return
        await this.redis.setex(key, PINCODE_CONSTANTS.CACHE_TTL_SECONDS, JSON.stringify(record)).catch(() => {});
        return record;
    }

    async processBulkUpload(csvString: string, adminId: string): Promise<{ processed: number; errors: string[] }> {
        const parsed = Papa.parse<CSVRow>(csvString, {
            header: true,
            skipEmptyLines: true,
        });

        const criticalErrors = parsed.errors.filter(e => e.code !== 'UndetectableDelimiter');
        if (criticalErrors.length > 0) {
            throw new AppError(ErrorCode.INVALID_CSV, 'CSV parsing failed', { errors: criticalErrors });
        }

        const rows = parsed.data;
        if (rows.length > PINCODE_CONSTANTS.BULK_UPLOAD_LIMIT) {
           throw new AppError(ErrorCode.BULK_UPLOAD_LIMIT, `Max ${PINCODE_CONSTANTS.BULK_UPLOAD_LIMIT} rows allowed for pincode upload`);
        }

        const records: PincodeRecord[] = [];
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;
            try {
                if (!row.pincode || row.pincode.trim() === '') {
                    throw new Error('Missing pincode');
                }

                // Tight validation for 6-digit numeric pincode
                const pin = String(row.pincode).trim();
                if (!/^\d{6}$/.test(pin)) {
                    throw new Error('Pincode must be exactly 6 digits');
                }

                // Partner validation
                const partner = row.partner ? String(row.partner).trim() : PINCODE_CONSTANTS.DEFAULT_PARTNER;
                if (!PINCODE_CONSTANTS.ALLOWED_PARTNERS.includes(partner) && partner !== 'None') {
                    throw new Error(`Invalid partner: ${partner}. Allowed: ${PINCODE_CONSTANTS.ALLOWED_PARTNERS.join(', ')}`);
                }

                // Estimated days validation
                let estimatedDays = PINCODE_CONSTANTS.DEFAULT_ESTIMATED_DAYS;
                if (row.estimated_days) {
                    const parsedDays = parseInt(row.estimated_days, 10);
                    if (isNaN(parsedDays) || parsedDays < PINCODE_CONSTANTS.MIN_ESTIMATED_DAYS || parsedDays > PINCODE_CONSTANTS.MAX_ESTIMATED_DAYS) {
                        throw new Error(`estimated_days must be between ${PINCODE_CONSTANTS.MIN_ESTIMATED_DAYS} and ${PINCODE_CONSTANTS.MAX_ESTIMATED_DAYS}`);
                    }
                    estimatedDays = parsedDays;
                }

                records.push({
                    pincode: pin,
                    deliverable: row.deliverable ? String(row.deliverable).toLowerCase() === 'true' : true,
                    codAvailable: row.cod_available ? String(row.cod_available).toLowerCase() === 'true' : false,
                    estimatedDays,
                    partner
                });
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Unknown validation error';
                errors.push(`Row ${i + 2}: ${message}`);
            }
        }

        if (records.length > 0) {
            await this.pincodeRepo.bulkUpsert(records);
            
            // Audit Log (Rule 6)
            await this.auditLogRepo.insert({
                adminId,
                action: 'BULK_UPLOAD',
                entityType: 'pincode',
                entityId: 'multiple',
                afterJson: { count: records.length, errors: errors.length }
            });
        }

        return { processed: records.length, errors };
    }
}
