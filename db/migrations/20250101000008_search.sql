-- =============================================================================
-- Migration: 20250101000008_search.sql
-- Description: Analytics table for Search queries
-- =============================================================================

CREATE TABLE IF NOT EXISTS search_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id), -- Nullable for guests
  session_id  VARCHAR(255),
  query       TEXT NOT NULL,
  filters     JSONB,
  result_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for analytics aggregation
CREATE INDEX IF NOT EXISTS search_logs_query_idx ON search_logs(query);
CREATE INDEX IF NOT EXISTS search_logs_created_at_idx ON search_logs(created_at DESC);
