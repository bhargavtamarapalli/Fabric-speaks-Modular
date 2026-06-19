-- Migration: Add missing foreign key constraints to audit tables
-- Date: 2026-04-02
-- Purpose: Ensure referential integrity on audit trail tables
-- Impact: Prevents orphaned audit records if variants or users deleted

-- Step 1: Add FK to inventory_adjustment_log.variant_id
ALTER TABLE IF EXISTS inventory_adjustment_log
  ADD CONSTRAINT fk_inv_adj_log_variant_id
  FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE RESTRICT;

-- Step 2: Add FK to inventory_adjustment_log.user_id (allow NULL if user deleted)
ALTER TABLE IF EXISTS inventory_adjustment_log
  ADD CONSTRAINT fk_inv_adj_log_user_id
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Step 3: Add FK to expected_stock_arrivals.variant_id (CASCADE: if variant deleted, arrival deleted)
ALTER TABLE IF EXISTS expected_stock_arrivals
  ADD CONSTRAINT fk_exp_stock_variant_id
  FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE;

-- Step 4: Create index for faster FK lookups
CREATE INDEX IF NOT EXISTS idx_inv_adj_log_variant_created
  ON inventory_adjustment_log(variant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exp_stock_variant_date
  ON expected_stock_arrivals(variant_id, arrival_date);

-- Verification
SELECT 
  constraint_name,
  table_name,
  column_name,
  foreign_table_name
FROM information_schema.key_column_usage
WHERE table_name IN ('inventory_adjustment_log', 'expected_stock_arrivals')
  AND constraint_type = 'FOREIGN KEY'
ORDER BY table_name;
