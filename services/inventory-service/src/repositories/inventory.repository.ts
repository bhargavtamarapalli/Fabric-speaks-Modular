import { getDbPool } from '@fs/shared';
import { v4 as uuidv4 } from 'uuid';

export interface VariantStock {
  id: string;
  product_id: string;
  sku: string;
  stock_qty: number;
}

export interface InventoryAdjustmentLog {
  id: string;
  variant_id: string;
  old_qty: number;
  new_qty: number;
  reason: string;
  user_id: string;
  created_at?: Date;
}

export class InventoryRepository {
  async getVariant(variantId: string): Promise<VariantStock | null> {
    const pool = getDbPool();
    const query = `
      SELECT id, product_id, sku, stock_qty 
      FROM variants 
      WHERE id = $1;
    `;
    const result = await pool.query(query, [variantId]);
    return result.rows[0] || null;
  }

  async getAllVariants(sortBy: 'asc' | 'desc' = 'asc'): Promise<VariantStock[]> {
    const pool = getDbPool();
    // Sort by stock_qty to allow finding low stock easily
    const query = `
      SELECT id, product_id, sku, stock_qty 
      FROM variants 
      ORDER BY stock_qty ${sortBy === 'desc' ? 'DESC' : 'ASC'};
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async adjustStock(
    variantId: string, 
    newQty: number, 
    reason: string, 
    userId: string
  ): Promise<VariantStock> {
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Get current with FOR UPDATE to prevent concurrent modifications
      const getQuery = `
        SELECT id, stock_qty 
        FROM variants 
        WHERE id = $1 FOR UPDATE;
      `;
      const currentRes = await client.query(getQuery, [variantId]);
      
      if (currentRes.rows.length === 0) {
        throw new Error(`Variant ${variantId} not found`);
      }
      
      const oldQty = currentRes.rows[0].stock_qty;

      // 2. Update stock
      const updateQuery = `
        UPDATE variants 
        SET stock_qty = $1 
        WHERE id = $2 
        RETURNING id, product_id, sku, stock_qty;
      `;
      const updateRes = await client.query(updateQuery, [newQty, variantId]);
      const updatedVariant = updateRes.rows[0];

      // 3. Log adjustment
      const logId = uuidv4();
      const logQuery = `
        INSERT INTO inventory_adjustment_log
        (id, variant_id, old_qty, new_qty, reason, user_id)
        VALUES ($1, $2, $3, $4, $5, $6);
      `;
      await client.query(logQuery, [logId, variantId, oldQty, newQty, reason, userId]);

      await client.query('COMMIT');
      return updatedVariant;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getHealthSummary(): Promise<{ healthStatus: string; count: number }[]> {
    const pool = getDbPool();
    const query = `
      SELECT 
        CASE 
          WHEN stock_qty = 0 THEN 'CRITICAL'
          WHEN stock_qty < 5 THEN 'WARNING'
          ELSE 'HEALTHY'
        END as health_status,
        COUNT(*) as count
      FROM variants
      GROUP BY health_status;
    `;
    const result = await pool.query(query);
    return result.rows.map(r => ({
      healthStatus: r.health_status,
      count: parseInt(r.count, 10)
    }));
  }
}
