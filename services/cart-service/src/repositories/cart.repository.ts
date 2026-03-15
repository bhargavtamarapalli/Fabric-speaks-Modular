import { BaseRepository, DbClient } from '@fs/shared';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { getEffectivePrice } from '@fs/shared';

export interface CartItem {
    variantId: string;
    quantity: number;
    price?: number; // RULE 1: Stored here for guests and time-locking
    // Hydrated fields (UI only)
    productId?: string;
    name?: string;
    sku?: string;
    stock_qty?: number;
}

export class CartRepository extends BaseRepository {
    private readonly REDIS_PREFIX = 'cart:guest:';
    private readonly TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

    constructor(db: Pool | DbClient, private redis: Redis) {
        super(db);
    }

    // ==========================================================
    // USER CART (PostgreSQL)
    // ==========================================================

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

    async updateUserItemQty(userId: string, variantId: string, quantity: number): Promise<void> {
        const query = `
            UPDATE cart_items 
            SET quantity = $3, updated_at = now()
            WHERE user_id = $1 AND variant_id = $2
        `;
        await this.query(query, [userId, variantId, quantity]);
    }

    async removeUserItem(userId: string, variantId: string): Promise<void> {
        const query = `
            DELETE FROM cart_items 
            WHERE user_id = $1 AND variant_id = $2
        `;
        await this.query(query, [userId, variantId]);
    }

    async clearUserCart(userId: string): Promise<void> {
        const query = `DELETE FROM cart_items WHERE user_id = $1`;
        await this.query(query, [userId]);
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
