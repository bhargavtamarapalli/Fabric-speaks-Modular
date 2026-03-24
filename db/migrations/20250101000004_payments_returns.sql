-- =============================================================================
-- Migration: 20250101000004_payments_returns.sql
-- Description: Payment and return entities — payments, return_requests, return_items
-- LLD Reference: Section 2.3 (payments) + Section 2.3 (returns)
-- Rules: UUID PKs, razorpay_payment_id UNIQUE (idempotency key), soft-delete on returns
-- Depends on: 20250101000003_orders.sql
-- =============================================================================

-- =============================================================================
-- payments
-- NOTE: No raw card data is ever stored here.
-- Razorpay handles tokenisation. method_hint is for display only.
-- razorpay_payment_id is the idempotency key for the PAY-04 webhook.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM (
'PENDING',
  'CAPTURED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS payments (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID            NOT NULL REFERENCES orders(id),
  user_id             UUID            NOT NULL REFERENCES users(id),
  -- UNIQUE: used as idempotency key in PAY-04 webhook processing
  -- Webhook flow: check this ID first → already exists? return 200 without reprocessing
  razorpay_order_id   VARCHAR(100)    UNIQUE,
  razorpay_payment_id VARCHAR(100)    UNIQUE,
  amount              NUMERIC(10,2)   NOT NULL,
  currency            CHAR(3)         NOT NULL DEFAULT 'INR',
  status              payment_status  NOT NULL DEFAULT 'PENDING',
  -- Display hint only. No raw card numbers, CVVs, or account details stored.
  method_hint         VARCHAR(50),    -- e.g. 'upi', 'card' (Razorpay tokenises actual details)
  failure_reason      TEXT,
  refund_id           VARCHAR(100),
  refund_amount       NUMERIC(10,2),
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments(order_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx  ON payments(user_id);

-- =============================================================================
-- return_requests + return_items
-- return_requests uses soft-delete (is_deleted) to maintain audit trail
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_type') THEN
    CREATE TYPE return_type AS ENUM (
'WRONG_ITEM',
  'DAMAGED',
  'SIZE_EXCHANGE',
  'CHANGED_MIND',
  'OTHER'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status') THEN
    CREATE TYPE return_status AS ENUM (
'REQUESTED',
  'APPROVED',
  'REJECTED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'INSPECTED',
  'COMPLETED',
  'FAST_TRACKED'    -- Express return path: approved + refund issued within 24h
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS return_requests (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID          NOT NULL REFERENCES orders(id),
  user_id               UUID          NOT NULL REFERENCES users(id),
  return_type           return_type   NOT NULL,
  status                return_status NOT NULL DEFAULT 'REQUESTED',
  -- Fast-track: admin can approve + issue refund same-day (within 24h SLA)
  is_fast_track         BOOLEAN       NOT NULL DEFAULT false,
  -- For SIZE_EXCHANGE: a new replacement order is created
  replacement_order_id  UUID          REFERENCES orders(id),
  shiprocket_return_id  VARCHAR(100),
  resolved_at           TIMESTAMPTZ,
  agent_notes           TEXT,
  is_deleted            BOOLEAN       NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS return_requests_order_id_idx
  ON return_requests(order_id);

CREATE INDEX IF NOT EXISTS return_requests_user_id_idx
  ON return_requests(user_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS return_requests_status_idx
  ON return_requests(status) WHERE is_deleted = false;

-- =============================================================================
-- return_items (per-item tracking within a return request)
-- =============================================================================

CREATE TABLE IF NOT EXISTS return_items (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID          NOT NULL REFERENCES return_requests(id),
  order_item_id     UUID          NOT NULL REFERENCES order_items(id),
  variant_id        UUID          NOT NULL REFERENCES variants(id),
  quantity          SMALLINT      NOT NULL CHECK (quantity > 0),
  -- Refund amount for this specific item (may be partial)
  refund_amount     NUMERIC(10,2),
  -- Outcome after inspection: 'restocked' | 'damaged_no_restock' | 'pending'
  inspection_result VARCHAR(50),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS return_items_return_request_id_idx
  ON return_items(return_request_id);

CREATE INDEX IF NOT EXISTS return_items_variant_id_idx
  ON return_items(variant_id);














