-- Migration: 20250101000012_fix_orders_for_guests.sql
-- Description: Make user_id nullable and add guest fields to orders
-- Depends on: 20250101000003_orders.sql

ALTER TABLE orders 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS guest_mobile VARCHAR(15),
ADD COLUMN IF NOT EXISTS guest_address TEXT;

-- Index for guest tracking
CREATE INDEX IF NOT EXISTS orders_guest_mobile_idx ON orders(guest_mobile) WHERE user_id IS NULL;
