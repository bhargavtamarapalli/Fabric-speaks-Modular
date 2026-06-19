-- =============================================================================
-- Migration: 20250101000018_guest_addresses.sql
-- Description: Allows guest checkout addresses to be stored for fulfillment
-- Depends on: 20250101000001_initial_schema.sql, 20250101000011_order_guest_fields.sql
-- =============================================================================

-- Up: Allow guest addresses by making user_id nullable
ALTER TABLE addresses
  ALTER COLUMN user_id DROP NOT NULL;

-- Add columns to track guest addresses and retention
ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS guest_session_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS retention_deadline TIMESTAMPTZ;

-- Add CHECK constraint to ensure every address has at least one owner
ALTER TABLE addresses
  ADD CONSTRAINT address_owner_check 
  CHECK (user_id IS NOT NULL OR order_id IS NOT NULL OR guest_session_id IS NOT NULL);

-- Create index for guest address lookups and cleanup
CREATE INDEX IF NOT EXISTS addresses_guest_session_retention_idx
  ON addresses(guest_session_id, retention_deadline) 
  WHERE user_id IS NULL;

-- Down: Revert nullable user_id and guest address columns
-- To restore the original constraints, run:
-- ALTER TABLE addresses DROP CONSTRAINT IF EXISTS address_owner_check;
-- DELETE FROM addresses WHERE user_id IS NULL;
-- ALTER TABLE addresses ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE addresses DROP COLUMN IF EXISTS order_id;
-- ALTER TABLE addresses DROP COLUMN IF EXISTS guest_session_id;
-- ALTER TABLE addresses DROP COLUMN IF EXISTS retention_deadline;
-- DROP INDEX IF EXISTS addresses_guest_session_retention_idx;













