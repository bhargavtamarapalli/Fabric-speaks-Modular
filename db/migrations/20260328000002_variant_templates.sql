-- =============================================================================
-- Migration: 20260328000002_variant_templates.sql
-- Description: Global Variant Templates for reusable size/colour presets
-- =============================================================================

CREATE TABLE IF NOT EXISTS variant_templates (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) UNIQUE NOT NULL,
  sizes      TEXT[]       NOT NULL DEFAULT '{}',
  colours    TEXT[]       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

