import { BaseRepository } from '@fs/shared';
import { Pool } from 'pg';
import { Redis } from 'ioredis';

export interface CartItem {
  variantId: string;
  quantity: number;
  price?: number;
  stock_qty?: number;
}

export class CartRepository extends BaseRepository {
  private readonly tableName = 'carts';
  private readonly GUEST_PREFIX = 'cart:guest:';

  constructor(db: Pool, private redis: Redis) {
    super(db);
  }

  // --- DB Operations ---

    async getUserCart(userId: string): Promise<CartItem[]> {
        const query = `
            SELECT 
                c.variant_id as "variantId", 
                c.quantity,
                c.price_at_add as "priceAtAdd",
                v.product_id as "productId",
                v.sku,
                v.stock_qty,
                p.name
        FROM cart_items c
        JOIN variants v ON c.variant_id = v.id
        JOIN products p ON v.product_id = p.id
        WHERE c.user_id = $1
        ORDER BY c.added_at DESC
    `;
    const result = await this.query(query, [userId]);
    
    return result.rows.map(row => ({
        variantId: row.variantId,
        quantity: row.quantity,
        productId: row.productId,
        name: row.name,
        sku: row.sku,
        price: Number(row.priceAtAdd), // RULE 1: Use locked price, never re-fetch from variant
        stock_qty: row.stock_qty
    }));
}

    async addUserItem(userId: string, variantId: string, quantity: number, priceAtAdd: number): Promise<void> {
        const query = `
            INSERT INTO cart_items (user_id, variant_id, quantity, price_at_add)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, variant_id)
            DO UPDATE SET 
                quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, 10),
                price_at_add = COALESCE(cart_items.price_at_add, EXCLUDED.price_at_add),
                updated_at = now()
                -- NOTE: Do NOT update price_at_add on quantity change (lock price)
        `;
        await this.query(query, [userId, variantId, quantity, priceAtAdd]);
    }

  // Update user item qty
  async updateUserItemQty(userId: string, variantId: string, quantity: number): Promise<void> {
    await this.query(
      'UPDATE cart_items SET quantity = $1 FROM carts WHERE cart_items.cart_id = carts.id AND carts.user_id = $2 AND variant_id = $3',
      [quantity, userId, variantId]
    );
  }

  // Remove user item
  async removeUserItem(userId: string, variantId: string): Promise<void> {
    await this.query(
      'DELETE FROM cart_items USING carts WHERE cart_items.cart_id = carts.id AND carts.user_id = $1 AND variant_id = $2',
      [userId, variantId]
    );
  }

  // --- Guest Cart (Redis) Operations ---

  async getGuestCart(sessionId: string): Promise<CartItem[]> {
    const data = await this.redis.get(`${this.GUEST_PREFIX}${sessionId}`);
    return data ? JSON.parse(data) : [];
  }

  async saveGuestCart(sessionId: string, items: CartItem[]): Promise<void> {
    await this.redis.setex(`${this.GUEST_PREFIX}${sessionId}`, 7 * 24 * 60 * 60, JSON.stringify(items));
  }

  async clearGuestCart(sessionId: string): Promise<void> {
    await this.redis.del(`${this.GUEST_PREFIX}${sessionId}`);
  }

  // --- Coupon Cache ---

  async getCouponUsageCount(userId: string, couponId: string) {
    const result = await this.query(
      'SELECT COUNT(*) as count FROM user_coupon_usage WHERE user_id = $1 AND coupon_id = $2',
      [userId, couponId]
    );
    return parseInt(result.rows[0].count, 10);
  }
}
