import { query } from '@fs/shared/db';
import { v4 as uuidv4 } from 'uuid';
import { CouponListQueryDto, CreateCouponDto, UpdateCouponDto } from '../schemas/coupon.schemas';
import { PaginatedResponse } from '@fs/shared/types';

export class CouponRepository {
  async list(filters: CouponListQueryDto): Promise<PaginatedResponse<any>> {
    const params: any[] = [];
    let whereClause = '1=1';

    if (filters['filter[is_active]'] !== undefined) {
      params.push(filters['filter[is_active]']);
      whereClause += ` AND is_active = $${params.length}`;
    }

    if (filters['filter[discount_type]']) {
      params.push(filters['filter[discount_type]']);
      whereClause += ` AND discount_type = $${params.length}`;
    }

    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT 
        id, code, discount_type as "discountType", discount_value as "discountValue",
        max_discount as "maxDiscount", min_order_amount as "minOrderAmount",
        max_uses_total as "maxUsesTotal", max_uses_per_user as "maxUsesPerUser",
        uses_count as "usesCount", valid_from as "validFrom", valid_until as "validUntil",
        is_active as "isActive", created_at as "createdAt"
      FROM coupons
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countSql = `SELECT COUNT(*) FROM coupons WHERE ${whereClause}`;

    const [dataRes, countRes] = await Promise.all([
      query(sql, [...params, limit, offset]),
      query(countSql, params),
    ]);

    const total = parseInt(countRes.rows[0].count, 10);

    return {
      items: dataRes.rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<any | null> {
    const { rows } = await query(
      `SELECT * FROM coupons WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  async findByCode(code: string): Promise<any | null> {
    const { rows } = await query(
      `SELECT * FROM coupons WHERE code = $1`,
      [code]
    );
    return rows[0] || null;
  }

  async create(data: CreateCouponDto): Promise<any> {
    const id = uuidv4();
    const sql = `
      INSERT INTO coupons (
        id, code, discount_type, discount_value, max_discount,
        min_order_amount, max_uses_total, max_uses_per_user,
        valid_from, valid_until, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING id, code
    `;

    const params = [
      id,
      data.code,
      data.discountType,
      data.discountValue,
      data.maxDiscount || null,
      data.minOrderAmount,
      data.maxUsesTotal || null,
      data.maxUsesPerUser,
      data.validFrom,
      data.validUntil,
    ];

    const { rows } = await query(sql, params);
    return rows[0];
  }

  async update(id: string, data: UpdateCouponDto): Promise<any> {
    const setParts: string[] = [];
    const params: any[] = [id];
    let paramIdx = 2;

    if (data.isActive !== undefined) {
      setParts.push(`is_active = $${paramIdx++}`);
      params.push(data.isActive);
    }
    if (data.validUntil !== undefined) {
      setParts.push(`valid_until = $${paramIdx++}`);
      params.push(data.validUntil);
    }
    if (data.maxUsesTotal !== undefined) {
      setParts.push(`max_uses_total = $${paramIdx++}`);
      params.push(data.maxUsesTotal);
    }

    if (setParts.length === 0) return null;

    setParts.push(`updated_at = NOW()`);

    const sql = `
      UPDATE coupons
      SET ${setParts.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await query(sql, params);
    return rows[0];
  }
}

export const couponRepository = new CouponRepository();
