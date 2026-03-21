-- Align notification_log with notification-service usage
ALTER TABLE IF EXISTS notification_log
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS notification_log
  ALTER COLUMN template_id DROP NOT NULL;

ALTER TABLE IF EXISTS notification_log
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS recipient VARCHAR(100),
  ADD COLUMN IF NOT EXISTS provider_response JSONB;

CREATE INDEX IF NOT EXISTS notification_log_order_sent_idx
ON notification_log(order_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS notification_log_status_sent_idx
ON notification_log(status, sent_at DESC);

CREATE INDEX IF NOT EXISTS notification_log_provider_response_gin
ON notification_log USING GIN(provider_response);
