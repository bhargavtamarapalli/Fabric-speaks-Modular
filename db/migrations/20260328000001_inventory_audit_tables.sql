-- Migration: 20260316000002_inventory_audit_tables
-- Creates inventory_adjustment_log and expected_stock_arrivals tables
-- Note: admin_audit_log is defined in 20250101000005_collections_notifications.sql

CREATE TABLE IF NOT EXISTS inventory_adjustment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL,
  old_qty INTEGER NOT NULL,
  new_qty INTEGER NOT NULL,
  reason TEXT NOT NULL,
  user_id UUID NOT NULL,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expected_stock_arrivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL,
  expected_qty INTEGER NOT NULL,
  arrival_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ARRIVED', 'CANCELLED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Standard indexes
CREATE INDEX IF NOT EXISTS idx_inv_adj_variant ON inventory_adjustment_log(variant_id);
CREATE INDEX IF NOT EXISTS idx_exp_stock_variant ON expected_stock_arrivals(variant_id);
CREATE INDEX IF NOT EXISTS idx_exp_stock_status ON expected_stock_arrivals(status);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_inv_adj_before_json ON inventory_adjustment_log USING GIN (before_json);
CREATE INDEX IF NOT EXISTS idx_inv_adj_after_json ON inventory_adjustment_log USING GIN (after_json);
