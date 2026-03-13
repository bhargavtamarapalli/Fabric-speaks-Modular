import { BaseRepository } from '@fs/shared';

export interface Coupon {
    id: string;
    code: string;
    discount_type: 'PERCENT' | 'FIXED';
    discount_value: number;
    max_discount: number | null;
    min_order_amount: number;
    max_uses_total: number | null;
    max_uses_per_user: number;
    uses_count: number;
    valid_from: Date;
    valid_until: Date;
    is_active: boolean;
}

export class CouponRepository extends BaseRepository {
    async findByCode(code: string): Promise<Coupon | null> {
        const query = `
            SELECT * FROM coupons 
            WHERE code = $1 AND is_active = true
        `;
        const result = await this.query(query, [code]);
        return (result.rows[0] as Coupon) || null;
    }

    async getUserRedemptionCount(couponId: string, userId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) as count 
            FROM coupon_redemptions 
            WHERE coupon_id = $1 AND user_id = $2
        `;
        const result = await this.query(query, [couponId, userId]);
        return parseInt(result.rows[0].count, 10);
    }
}
