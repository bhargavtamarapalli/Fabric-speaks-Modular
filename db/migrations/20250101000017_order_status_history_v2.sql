-- =============================================================================
-- Migration: 20250101000017_order_status_history_v2.sql
-- Description: Expands order_status_history to support richer timeline metadata
-- Depends on: 20250101000009_order_service_additions.sql
-- =============================================================================

ALTER TABLE order_status_history
  ADD COLUMN IF NOT EXISTS previous_status order_status,
  ADD COLUMN IF NOT EXISTS actor_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS note TEXT;

UPDATE order_status_history
SET note = COALESCE(note, notes)
WHERE note IS NULL
  AND notes IS NOT NULL;

UPDATE order_status_history
SET actor_id = COALESCE(actor_id, created_by)
WHERE actor_id IS NULL
  AND created_by IS NOT NULL;

UPDATE order_status_history
SET actor_type = CASE
  WHEN actor_type IS NOT NULL THEN actor_type
  WHEN COALESCE(note, notes, '') ILIKE 'Shiprocket webhook:%' THEN 'courier'
  WHEN COALESCE(actor_id, created_by) IS NOT NULL THEN 'admin'
  ELSE 'system'
END
WHERE actor_type IS NULL;

ALTER TABLE order_status_history
  ALTER COLUMN actor_type SET DEFAULT 'system';

UPDATE order_status_history
SET previous_status = previous_event.status
FROM (
  SELECT
    id,
    LAG(status) OVER (PARTITION BY order_id ORDER BY created_at ASC, id ASC) AS status
  FROM order_status_history
) AS previous_event
WHERE order_status_history.id = previous_event.id
  AND order_status_history.previous_status IS NULL;

CREATE INDEX IF NOT EXISTS order_status_history_actor_type_idx
  ON order_status_history(actor_type, created_at DESC);













