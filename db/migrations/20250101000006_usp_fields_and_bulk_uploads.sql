-- =============================================================================
-- Migration: 20250101000006_usp_fields_and_bulk_uploads.sql
-- Description: Add Fabric Speaks USP fields to products and bulk upload tracking
-- =============================================================================

-- 1. Add USP fields to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS fabric_type          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gsm_weight           INTEGER,
  ADD COLUMN IF NOT EXISTS weave_type           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS breathability_rating VARCHAR(50),
  ADD COLUMN IF NOT EXISTS care_instructions    TEXT,
  ADD COLUMN IF NOT EXISTS fabric_origin        VARCHAR(100);

-- Update FTS index to include new USP fields
DROP INDEX IF EXISTS products_fts_idx;
CREATE INDEX products_fts_idx ON products USING GIN(
  to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(fabric_details, '') || ' ' ||
    coalesce(fabric_type, '') || ' ' ||
    coalesce(weave_type, '') || ' ' ||
    coalesce(fabric_origin, '')
  )
);

-- 2. Bulk Upload Tracking Table
CREATE TYPE IF NOT EXISTS bulk_upload_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS bulk_uploads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename     VARCHAR(255) NOT NULL,
  total_rows   INTEGER NOT NULL DEFAULT 0,
  success_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows  INTEGER NOT NULL DEFAULT 0,
  status       bulk_upload_status NOT NULL DEFAULT 'pending',
  error_report JSONB,           -- array of {row, field, fix}
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bulk_uploads_created_by_idx ON bulk_uploads(created_by);
CREATE INDEX IF NOT EXISTS bulk_uploads_status_idx ON bulk_uploads(status);
