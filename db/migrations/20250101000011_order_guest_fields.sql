-- =============================================================================
-- Migration: 20250101000011_order_guest_fields.sql
-- Description: Add guest checkout support to orders table
--              - Make user_id nullable for guest orders
--              - Add guest_mobile, guest_address for guest tracking
--              - Ensure at least user_id OR guest_mobile is set (CHECK constraint)
-- Depends on: 20250101000003_orders.sql
-- =============================================================================

-- =============================================================================
-- ALTER orders: Make user_id nullable, add guest fields
-- =============================================================================

-- Step 1: Add new columns (nullable initially)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS guest_mobile VARCHAR(15),
  ADD COLUMN IF NOT EXISTS guest_address TEXT;

-- Step 2: Make user_id nullable (to support guest orders)
ALTER TABLE orders
  ALTER COLUMN user_id DROP NOT NULL;

-- Step 3: Add CHECK constraint to ensure either user_id or guest_mobile is set
-- This prevents fully anonymous orders (must have either authenticated user or guest identifier)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_user_or_guest_check') THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_user_or_guest_check
      CHECK (user_id IS NOT NULL OR guest_mobile IS NOT NULL);
  END IF;
END
$$;

-- Step 4: Create partial index on guest_mobile for guest order lookups (faster for tracking)
CREATE INDEX IF NOT EXISTS orders_guest_mobile_idx
  ON orders(guest_mobile, created_at DESC)
  WHERE guest_mobile IS NOT NULL;

-- =============================================================================
-- ALTER order_items: Add tracking fields for guest tracking
-- =============================================================================

-- Add guest_tracking_ref: Used in guest tracking URL (hashed variant of tracking_url)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS guest_tracking_ref VARCHAR(64);

-- Create unique index to allow guest lookups by tracking ref
CREATE UNIQUE INDEX IF NOT EXISTS orders_guest_tracking_ref_idx
  ON orders(guest_tracking_ref)
  WHERE guest_tracking_ref IS NOT NULL;

-- =============================================================================
-- Rollback commands (for reference, not executed):
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_or_guest_check;
-- ALTER TABLE orders ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE orders DROP COLUMN IF EXISTS guest_mobile;
-- ALTER TABLE orders DROP COLUMN IF EXISTS guest_address;
-- ALTER TABLE orders DROP COLUMN IF EXISTS guest_tracking_ref;
-- =============================================================================













