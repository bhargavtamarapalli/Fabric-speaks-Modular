-- =============================================================================
-- Migration: 20260316000001_phase2plus.sql
-- Description: Phase 2+ enablement for admin scale features
--              (session controls, scheduled price changes, templates, security)
-- =============================================================================

-- =============================================================================
-- 1) Admin session revocation support
-- =============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_revoked_at TIMESTAMPTZ;

-- =============================================================================
-- 2) Sale event pause tracking
-- =============================================================================

ALTER TABLE sale_events
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- =============================================================================
-- 3) Scheduled price changes (PRC-14)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_change_status') THEN
    CREATE TYPE price_change_status AS ENUM (
'scheduled',
  'processing',
  'applied',
  'failed',
  'cancelled'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_change_target') THEN
    CREATE TYPE price_change_target AS ENUM (
'product',
  'variant',
  'collection',
  'brand',
  'global'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_change_apply_to') THEN
    CREATE TYPE price_change_apply_to AS ENUM (
'base_price',
  'price_override'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS scheduled_price_changes (
  id               UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type      price_change_target      NOT NULL,
  target_ids       JSONB                    NOT NULL DEFAULT '[]',
  adjustment_type  VARCHAR(10)              NOT NULL CHECK (adjustment_type IN ('PERCENT', 'FIXED')),
  adjustment_value NUMERIC(10, 2)           NOT NULL,
  apply_to         price_change_apply_to    NOT NULL DEFAULT 'base_price',
  scheduled_at     TIMESTAMPTZ              NOT NULL,
  status           price_change_status      NOT NULL DEFAULT 'scheduled',
  created_by       UUID                     REFERENCES users(id),
  created_at       TIMESTAMPTZ              NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ              NOT NULL DEFAULT now(),
  applied_at       TIMESTAMPTZ,
  error_message    TEXT
);

CREATE INDEX IF NOT EXISTS scheduled_price_changes_status_idx
  ON scheduled_price_changes(status, scheduled_at);

CREATE INDEX IF NOT EXISTS scheduled_price_changes_target_gin
  ON scheduled_price_changes USING GIN(target_ids);

-- =============================================================================
-- 4) WhatsApp template registry (COM-05)
-- =============================================================================

ALTER TABLE broadcast_campaigns
  ADD COLUMN IF NOT EXISTS template_components JSONB NOT NULL DEFAULT '[]';

ALTER TABLE broadcast_campaigns
  ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'whatsapp_template_status') THEN
    CREATE TYPE whatsapp_template_status AS ENUM (
'pending',
  'approved',
  'rejected',
  'disabled'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id             UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id    VARCHAR(120)             UNIQUE NOT NULL,
  name           VARCHAR(120)             NOT NULL,
  status         whatsapp_template_status NOT NULL DEFAULT 'pending',
  language       VARCHAR(20)              NOT NULL DEFAULT 'en',
  category       VARCHAR(50),
  body           TEXT                     NOT NULL,
  variables_json JSONB                    NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ              NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ              NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_templates_status_idx
  ON whatsapp_templates(status);

CREATE INDEX IF NOT EXISTS whatsapp_templates_vars_gin
  ON whatsapp_templates USING GIN(variables_json);

-- =============================================================================
-- 5) Admin login attempts tracking (NOT-10)
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_hash  VARCHAR(64),
  ip_address   INET,
  success      BOOLEAN     NOT NULL DEFAULT false,
  reason       TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_login_attempts_mobile_idx
  ON admin_login_attempts(mobile_hash, attempted_at DESC);














