-- Customer flags for support agents (VIP/FRAUD notes)
CREATE TABLE IF NOT EXISTS customer_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_type   VARCHAR(20) NOT NULL,
  note        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_flags_user_idx
  ON customer_flags(user_id) WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS customer_flags_user_type_active_idx
  ON customer_flags(user_id, flag_type) WHERE is_active = true;













