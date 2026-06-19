-- Migration: 20250101000011_add_weight_to_variants.sql
-- Description: Add weight column to variants for shipping calculations
-- Depends on: 20250101000002_catalog.sql

ALTER TABLE variants 
ADD COLUMN IF NOT EXISTS weight NUMERIC(6,2) DEFAULT 0.5;

-- Update existing items if needed
UPDATE variants SET weight = 0.5 WHERE weight IS NULL;













