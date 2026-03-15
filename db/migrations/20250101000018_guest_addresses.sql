-- =============================================================================
-- Migration: 20250101000018_guest_addresses.sql
-- Description: Allows guest checkout addresses to be stored for fulfillment
-- Depends on: 20250101000001_initial_schema.sql, 20250101000011_order_guest_fields.sql
-- =============================================================================

ALTER TABLE addresses
  ALTER COLUMN user_id DROP NOT NULL;
