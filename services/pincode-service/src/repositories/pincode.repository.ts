import { BaseRepository } from '@fs/shared';

export interface PincodeRecord {
    pincode: string;
    deliverable: boolean;
    codAvailable: boolean;
    estimatedDays: number;
    partner: string;
}

export class PincodeRepository extends BaseRepository {

    async getPincode(pincode: string): Promise<PincodeRecord | null> {
        const query = `
            SELECT pincode, deliverable, cod_available, estimated_days, partner 
            FROM pincodes 
            WHERE pincode = $1
        `;
        const result = await this.query(query, [pincode]);
        return result.rows[0] ? this.mapToCamelCase<PincodeRecord>(result.rows[0]) : null;
    }

    async upsertPincode(record: PincodeRecord): Promise<void> {
        const query = `
            INSERT INTO pincodes (pincode, deliverable, cod_available, estimated_days, partner)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (pincode) 
            DO UPDATE SET 
                deliverable = EXCLUDED.deliverable,
                cod_available = EXCLUDED.cod_available,
                estimated_days = EXCLUDED.estimated_days,
                partner = EXCLUDED.partner,
                updated_at = now()
        `;
        await this.query(query, [
            record.pincode, 
            record.deliverable, 
            record.codAvailable, 
            record.estimatedDays, 
            record.partner
        ]);
    }

    // Helper for bulk upsert using a single transaction/unnest for performance
    async bulkUpsert(records: PincodeRecord[]): Promise<void> {
        const query = `
            INSERT INTO pincodes (pincode, deliverable, cod_available, estimated_days, partner)
            SELECT * FROM unnest(
                $1::varchar[], 
                $2::boolean[], 
                $3::boolean[], 
                $4::integer[], 
                $5::varchar[]
            )
            ON CONFLICT (pincode) 
            DO UPDATE SET 
                deliverable = EXCLUDED.deliverable,
                cod_available = EXCLUDED.cod_available,
                estimated_days = EXCLUDED.estimated_days,
                partner = EXCLUDED.partner,
                updated_at = now()
        `;
        
        await this.query(query, [
            records.map(r => r.pincode),
            records.map(r => r.deliverable),
            records.map(r => r.codAvailable),
            records.map(r => r.estimatedDays),
            records.map(r => r.partner),
        ]);
    }
}
