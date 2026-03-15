-- Migration: Add price_at_add column to cart_items (RULE 1 compliance)
-- Purpose: Time-lock prices at cart add time (prevent retroactive price changes)

ALTER TABLE cart_items
ADD COLUMN price_at_add NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Mark as sensitive: prices should never be re-fetched from variants table
-- CartService.addItem() MUST capture variant.unit_price at add time
-- CartService.getCart() MUST use price_at_add, never variant.unit_price

COMMENT ON COLUMN cart_items.price_at_add IS 
  'Price locked at time of addition. MUST NOT be updated after insert. Used instead of fetching current variant price (RULE 1).';
