-- =============================================================================
-- Migration: 20250101000007_pincodes.sql
-- Description: Pincode serviceability table
-- =============================================================================

CREATE TABLE IF NOT EXISTS pincodes (
  pincode         VARCHAR(10) PRIMARY KEY,
  deliverable     BOOLEAN NOT NULL DEFAULT true,
  cod_available   BOOLEAN NOT NULL DEFAULT false,
  estimated_days  INTEGER NOT NULL DEFAULT 5,
  partner         VARCHAR(50) NOT NULL DEFAULT 'Shiprocket',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by pincode, though it's already the primary key













