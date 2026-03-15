import { getDbPool, logger } from '@fs/shared';

export async function runMigrations() {
  const pool = getDbPool();
  
  try {
    const query = `
      -- Enums
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_type') THEN
              CREATE TYPE return_type AS ENUM (
                'WRONG_ITEM',
                'DAMAGED',
                'SIZE_EXCHANGE',
                'CHANGED_MIND',
                'OTHER'
              );
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status') THEN
              CREATE TYPE return_status AS ENUM (
                'REQUESTED', 
                'APPROVED', 
                'REJECTED', 
                'PICKUP_SCHEDULED', 
                'PICKED_UP', 
                'INSPECTED', 
                'COMPLETED', 
                'FAST_TRACKED'
              );
          END IF;
      END
      $$;

      -- Tables
      CREATE TABLE IF NOT EXISTS return_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL,
        user_id UUID NOT NULL,
        return_type return_type NOT NULL,
        status return_status NOT NULL DEFAULT 'REQUESTED',
        is_fast_track BOOLEAN NOT NULL DEFAULT false,
        replacement_order_id UUID,
        shiprocket_return_id VARCHAR(100),
        resolved_at TIMESTAMPTZ,
        agent_notes TEXT,
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS return_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_request_id UUID NOT NULL REFERENCES return_requests(id),
        order_item_id UUID NOT NULL,
        variant_id UUID NOT NULL,
        quantity SMALLINT NOT NULL CHECK (quantity > 0),
        refund_amount NUMERIC(10,2),
        inspection_result VARCHAR(50),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        before_json JSONB,
        after_json JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id);
      CREATE INDEX IF NOT EXISTS idx_return_requests_user ON return_requests(user_id) WHERE is_deleted = false;
      CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status) WHERE is_deleted = false;
      CREATE INDEX IF NOT EXISTS idx_return_items_request ON return_items(return_request_id);
    `;
    
    await pool.query(query);
    logger.info('✅ Successfully executed database migrations for Return Service (Aligned with Global Schema)');
  } catch (error) {
    logger.error('❌ Error executing migrations:', error);
    throw error;
  }
}
