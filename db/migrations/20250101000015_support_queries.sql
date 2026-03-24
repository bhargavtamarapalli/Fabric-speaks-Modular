-- =============================================================================
-- Migration: 20250101000015_support_queries.sql
-- Description: Support queue tables for support-service workflows
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_query_status') THEN
    CREATE TYPE support_query_status AS ENUM (
'open', 'in_progress', 'resolved'
    );
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_query_priority') THEN
    CREATE TYPE support_query_priority AS ENUM (
'P0', 'P1', 'P2'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS support_queries (
  id               UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID                   REFERENCES users(id) ON DELETE SET NULL,
  order_id         UUID                   REFERENCES orders(id) ON DELETE SET NULL,
  type             VARCHAR(50)            NOT NULL,
  summary          TEXT,
  priority         support_query_priority NOT NULL DEFAULT 'P2',
  status           support_query_status   NOT NULL DEFAULT 'open',
  wa_window_status VARCHAR(30),
  created_at       TIMESTAMPTZ            NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ            NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_queries_status_idx
  ON support_queries(status, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS support_queries_user_idx
  ON support_queries(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_query_notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id   UUID        NOT NULL REFERENCES support_queries(id) ON DELETE CASCADE,
  admin_id   UUID        REFERENCES users(id) ON DELETE SET NULL,
  text       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_query_notes_query_idx
  ON support_query_notes(query_id, created_at ASC);

-- Trigger function to automatically update updated_at on support_queries
CREATE OR REPLACE FUNCTION update_support_queries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run the function before updates
CREATE TRIGGER update_support_queries_updated_at
BEFORE UPDATE ON support_queries
FOR EACH ROW
EXECUTE FUNCTION update_support_queries_updated_at();















