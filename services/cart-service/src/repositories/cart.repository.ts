import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { getEffectivePrice } from '@fs/shared/pricing';

export interface CartItem {
    variantId: string;
    quantity: number;
    // Hydrated fields
    productId?: string;
    name?: string;
    sku?: string;
    price?: number;
    stock_qty?: number;
}

export class CartRepository {
    private readonly REDIS_PREFIX = 'cart:guest:';
    private readonly TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

    constructor(private db: Pool, private redis: Redis) {}

    // ==========================================================
    // USER CART (PostgreSQL)
    // ==========================================================

    async getUserCart(userId: string): Promise<CartItem[]> {
        const query = `
            SELECT 
                c.variant_id as "variantId", 
                c.quantity,
                v.product_id as "productId",
                v.sku,
                v.base_price,
                v.sale_price,
                v.stock_qty,
                p.name
            FROM cart_items c
            JOIN variants v ON c.variant_id = v.id
            JOIN products p ON v.product_id = p.id
            WHERE c.user_id = $1
            ORDER BY c.added_at DESC
        `;
        const result = await this.db.query(query, [userId]);
        
        return result.rows.map(row => ({
            variantId: row.variantId,
            quantity: row.quantity,
            productId: row.productId,
            name: row.name,
            sku: row.sku,
            price: getEffectivePrice(row.base_price, row.sale_price),
            stock_qty: row.stock_qty
        }));
    }

    async addUserItem(userId: string, variantId: string, quantity: number): Promise<void> {
        const query = `
            INSERT INTO cart_items (user_id, variant_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, variant_id)
            DO UPDATE SET 
                quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, 10),
                updated_at = now()
        `;
        await this.db.query(query, [userId, variantId, quantity]);
    }

    async updateUserItemQty(userId: string, variantId: string, quantity: number): Promise<void> {
        const query = `
            UPDATE cart_items 
            SET quantity = $3, updated_at = now()
            WHERE user_id = $1 AND variant_id = $2
        `;
        await this.db.query(query, [userId, variantId, quantity]);
    }

    async removeUserItem(userId: string, variantId: string): Promise<void> {
        const query = `
            DELETE FROM cart_items 
            WHERE user_id = $1 AND variant_id = $2
        `;
        await this.db.query(query, [userId, variantId]);
    }

    async clearUserCart(userId: string): Promise<void> {
        const query = `DELETE FROM cart_items WHERE user_id = $1`;
        await this.db.query(query, [userId]);
    }

    // ==========================================================
    // GUEST CART (Redis)
    // ==========================================================

    private getRedisKey(sessionId: string): string {
        return `${this.REDIS_PREFIX}${sessionId}`;
    }

    async getGuestCart(sessionId: string): Promise<CartItem[]> {
        const key = this.getRedisKey(sessionId);
        const data = await this.redis.get(key);
        if (!data) return [];
        return JSON.parse(data) as CartItem[];
    }

    async saveGuestCart(sessionId: string, items: CartItem[]): Promise<void> {
        const key = this.getRedisKey(sessionId);
        await this.redis.setex(key, this.TTL_SECONDS, JSON.stringify(items));
    }

    async clearGuestCart(sessionId: string): Promise<void> {
        const key = this.getRedisKey(sessionId);
        await this.redis.del(key);
    }
}
