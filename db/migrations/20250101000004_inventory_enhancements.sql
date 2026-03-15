-- =============================================================================
-- Migration: 20250101000004_inventory_enhancements.sql
-- Description: Add threshold_qty to variants for low-stock alerts
-- =============================================================================

ALTER TABLE variants
ADD COLUMN threshold_qty INTEGER NOT NULL DEFAULT 5 CHECK (threshold_qty >= 0);

COMMENT ON COLUMN variants.threshold_qty IS 'Minimum stock level before triggering low-stock alerts';
