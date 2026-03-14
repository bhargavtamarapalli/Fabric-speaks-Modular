-- Migration: 20250101000010_cart_price_time_lock.sql
-- Description: Add price_at_add to cart_items for Rule 1 (Price locking)
-- Depends on: 20250101000003_orders.sql

ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS price_at_add NUMERIC(10,2);
