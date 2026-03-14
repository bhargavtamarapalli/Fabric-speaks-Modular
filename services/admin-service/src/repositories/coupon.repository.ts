import { BaseRepository } from '@fs/shared';

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
    async list(filters: Record<string, unknown>): Promise<{ items: AdminCoupon[]; meta: Record<string, unknown> }> {
        const { page = 1, limit = 20 } = filters;
        const offset = ((page as number) - 1) * (limit as number);
        
        let query = 'SELECT * FROM coupons WHERE 1=1';
        const params: unknown[] = [];
        const { rows } = await this.query(query, params);
        return {
            items: rows.map(r => this.mapToCamelCase<AdminCoupon>(r)),
            meta: { total: rows.length }
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

    async create(data: Record<string, unknown>): Promise<AdminCoupon> {
        const query = `
            INSERT INTO coupons (code, discount_type, discount_value, min_order_amount)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const { rows } = await this.query(query, [data.code, data.discountType, data.discountValue, data.minOrderAmount]);
        return this.mapToCamelCase<AdminCoupon>(rows[0]);
    }

    async update(id: string, data: Record<string, unknown>): Promise<AdminCoupon> {
        // Simple update for demo purposes
        const query = 'UPDATE coupons SET discount_value = $2, updated_at = now() WHERE id = $1 RETURNING *';
        const { rows } = await this.query(query, [id, data.discountValue]);
        if (!rows.length) throw new Error('Coupon not found');
        return this.mapToCamelCase<AdminCoupon>(rows[0]);
    }
}
