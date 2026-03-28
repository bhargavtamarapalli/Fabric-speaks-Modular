import { BaseRepository, AppError, ErrorCode } from '@fs/shared';
import { CreateCouponDto, UpdateCouponDto } from '../schemas/coupon.schemas';

export interface AdminCoupon {
    id: string;
    code: string;
    discountType: 'PERCENT' | 'FIXED';
    discountValue: number;
    minOrderAmount: number;
    maxDiscount: number | null;
    maxUsesTotal: number | null;
    maxUsesPerUser: number;
    usesCount: number;
    validFrom: Date;
    validUntil: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt?: Date;
}

export class CouponRepository extends BaseRepository {
    async list(filters: {
        page?: number;
        limit?: number;
        'filter[is_active]'?: boolean;
        'filter[discount_type]'?: 'PERCENT' | 'FIXED';
    }): Promise<{ items: AdminCoupon[]; meta: { total: number; page: number; limit: number } }> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM coupons WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) FROM coupons WHERE 1=1';
        const params: unknown[] = [];
        const countParams: unknown[] = [];

        if (filters['filter[is_active]'] !== undefined) {
            params.push(filters['filter[is_active]']);
            countParams.push(filters['filter[is_active]']);
            query += ` AND is_active = $${params.length}`;
            countQuery += ` AND is_active = $${countParams.length}`;
        }

        if (filters['filter[discount_type]']) {
            params.push(filters['filter[discount_type]']);
            countParams.push(filters['filter[discount_type]']);
            query += ` AND discount_type = $${params.length}`;
            countQuery += ` AND discount_type = $${countParams.length}`;
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const { rows } = await this.query(query, params);
        
        const countRes = await this.query(countQuery, countParams);

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
            INSERT INTO coupons (
                code,
                discount_type,
                discount_value,
                max_discount,
                min_order_amount,
                max_uses_total,
                max_uses_per_user,
                valid_from,
                valid_until
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const { rows } = await this.query(query, [
            data.code,
            data.discountType,
            data.discountValue,
            data.maxDiscount ?? null,
            data.minOrderAmount,
            data.maxUsesTotal ?? null,
            data.maxUsesPerUser,
            data.validFrom,
            data.validUntil,
        ]);
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
            if (!result) throw new AppError(ErrorCode.NOT_FOUND, 'Coupon not found');
            return result;
        }

        const query = `UPDATE coupons SET ${fields.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`;
        const { rows } = await this.query(query, params);
        if (!rows.length) throw new AppError(ErrorCode.NOT_FOUND, 'Coupon not found');
        return this.mapToCamelCase<AdminCoupon>(rows[0]);
    }
}
