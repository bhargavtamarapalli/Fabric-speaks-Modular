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

  // Cart CRUD
  async findByUserId(userId: string) {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] ? this.mapToCamelCase(result.rows[0]) : null;
  }

  // Existing DB items
  async getUserCart(userId: string): Promise<CartItem[]> {
    const result = await this.query(
      'SELECT ci.* FROM cart_items ci JOIN carts c ON ci.cart_id = c.id WHERE c.user_id = $1',
      [userId]
    );
    return result.rows.map(item => this.mapToCamelCase(item));
  }

  // Add user item
  async addUserItem(userId: string, variantId: string, quantity: number, price: number): Promise<void> {
    await this.query(
      'SELECT add_to_cart($1, $2, $3, $4)',
      [userId, variantId, quantity, price]
    );
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
