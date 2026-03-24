-- =============================================================================
-- Migration: 20250101000014_sale_events.sql
-- Description: Scheduled promotions (Sale Events)
-- =============================================================================

CREATE TYPE sale_scope AS ENUM ('global', 'collection', 'specific_products');

CREATE TABLE IF NOT EXISTS sale_events (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(100)   NOT NULL,
  description    TEXT,
  discount_type  discount_type  NOT NULL,
  discount_value NUMERIC(10,2)  NOT NULL CHECK (discount_value > 0),
  scope          sale_scope     NOT NULL,
  -- If scope is 'collection', store collection_ids
  -- If scope is 'specific_products', store product_ids
  scope_ids      JSONB          NOT NULL DEFAULT '[]',
  starts_at      TIMESTAMPTZ    NOT NULL,
  ends_at        TIMESTAMPTZ    NOT NULL,
  is_active      BOOLEAN        NOT NULL DEFAULT true,
  created_by     UUID           REFERENCES users(id),
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sale_events_dates_idx ON sale_events(starts_at, ends_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS sale_events_scope_gin ON sale_events USING GIN(scope_ids);

-- Add check to ensure starts_at < ends_at
ALTER TABLE sale_events ADD CONSTRAINT sale_events_dates_check CHECK (starts_at < ends_at);













