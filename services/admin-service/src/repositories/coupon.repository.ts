import { BaseRepository } from '@fs/shared';
import { CreateCouponDto, UpdateCouponDto } from '../schemas/coupon.schemas';

export interface AdminCoupon {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    minOrderAmount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class CouponRepository extends BaseRepository {
    async list(filters: { page?: number; limit?: number }): Promise<{ items: AdminCoupon[]; meta: { total: number; page: number; limit: number } }> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM coupons WHERE is_active = true';
        const params: unknown[] = [];
        
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const { rows } = await this.query(query, params);
        
        const countRes = await this.query('SELECT COUNT(*) FROM coupons WHERE is_active = true');

        return {
            items: rows.map(r => this.mapToCamelCase<AdminCoupon>(r)),
            meta: { 
                total: parseInt(countRes.rows[0].count),
                page,
                limit
            }
        };
    }

    async findById(id: string): Promise<AdminCoupon | null> {
        const { rows } = await this.query('SELECT * FROM coupons WHERE id = $1', [id]);
        if (!rows.length) return null;
        return this.mapToCamelCase<AdminCoupon>(rows[0]);
    }

    async findByCode(code: string): Promise<AdminCoupon | null> {
        const { rows } = await this.query('SELECT * FROM coupons WHERE code = $1', [code]);
        if (!rows.length) return null;
        return this.mapToCamelCase<AdminCoupon>(rows[0]);
    }

    async create(data: CreateCouponDto): Promise<AdminCoupon> {
        const query = `
            INSERT INTO coupons (code, discount_type, discount_value, min_order_amount)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const { rows } = await this.query(query, [data.code, data.discountType, data.discountValue, data.minOrderAmount]);
        return this.mapToCamelCase<AdminCoupon>(rows[0]);
    }

    async update(id: string, data: UpdateCouponDto): Promise<AdminCoupon> {
        const fields: string[] = [];
        const params: unknown[] = [id];
        
        if (data.isActive !== undefined) {
            params.push(data.isActive);
            fields.push(`is_active = $${params.length}`);
        }
        if (data.validUntil !== undefined) {
            params.push(data.validUntil);
            fields.push(`valid_until = $${params.length}`);
        }
        if (data.maxUsesTotal !== undefined) {
            params.push(data.maxUsesTotal);
            fields.push(`max_uses_total = $${params.length}`);
        }

        if (fields.length === 0) {
            const result = await this.findById(id);
            if (!result) throw new Error('Coupon not found');
            return result;
        }

        const query = `UPDATE coupons SET ${fields.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`;
        const { rows } = await this.query(query, params);
        if (!rows.length) throw new Error('Coupon not found');
        return this.mapToCamelCase<AdminCoupon>(rows[0]);
    }
}
