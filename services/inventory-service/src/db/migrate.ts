import { getDbPool, logger } from '@fs/shared';

export async function runMigrations() {
  const pool = getDbPool();
  
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS inventory_adjustment_log (
        id UUID PRIMARY KEY,
        variant_id UUID NOT NULL,
        old_qty INTEGER NOT NULL,
        new_qty INTEGER NOT NULL,
        reason TEXT NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS expected_stock_arrivals (
        id UUID PRIMARY KEY,
        variant_id UUID NOT NULL,
        expected_qty INTEGER NOT NULL,
        arrival_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ARRIVED', 'CANCELLED')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_inv_adj_variant ON inventory_adjustment_log(variant_id);
      CREATE INDEX IF NOT EXISTS idx_exp_stock_variant ON expected_stock_arrivals(variant_id);
      CREATE INDEX IF NOT EXISTS idx_exp_stock_status ON expected_stock_arrivals(status);
    `;
    
    await pool.query(query);
    logger.info('✅ Successfully executed database migrations for Inventory Service');
  } catch (error) {
    logger.error('❌ Error executing migrations:', error);
    throw error;
  }
}
