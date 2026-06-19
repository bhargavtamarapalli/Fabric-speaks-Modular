-- =============================================================================
-- Migration: 20250101000016_return_status_history.sql
-- Description: Adds timeline tracking for return requests
-- Depends on: 20250101000004_payments_returns.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS return_status_history (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id       UUID         NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  status          return_status NOT NULL,
  previous_status return_status,
  actor_type      VARCHAR(20)  NOT NULL DEFAULT 'system',
  actor_id        UUID         REFERENCES users(id) ON DELETE SET NULL,
  note            TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS return_status_history_return_id_idx
  ON return_status_history(return_id, created_at ASC);

CREATE INDEX IF NOT EXISTS return_status_history_actor_type_idx
  ON return_status_history(actor_type, created_at DESC);

CREATE INDEX IF NOT EXISTS return_status_history_metadata_gin_idx
  ON return_status_history USING GIN(metadata);













