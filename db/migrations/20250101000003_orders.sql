-- =============================================================================
-- Migration: 20250101000003_orders.sql
-- Description: Commerce entities — coupons, orders, order_items,
--              stock_adjustments, cart_items (LLD Delta A1)
-- LLD Reference: Section 2.3 (Commerce Entities) + LLD Delta A1, A2, A4
-- Rules: UUID PKs, state machine via ENUM + CHECK, INSERT-only for stock_adjustments
-- Depends on: 20250101000001_initial_schema.sql, 20250101000002_catalog.sql
-- =============================================================================

-- =============================================================================
-- coupons + coupon_redemptions
-- NOTE: coupons must be created BEFORE orders due to the FK in orders.coupon_id
-- =============================================================================

CREATE TYPE IF NOT EXISTS discount_type AS ENUM ('PERCENT', 'FIXED');

CREATE TABLE IF NOT EXISTS coupons (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code             VARCHAR(50)   UNIQUE NOT NULL,
  discount_type    discount_type NOT NULL,
  discount_value   NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  max_discount     NUMERIC(10,2),              -- cap for PERCENT type
  min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses_total   INTEGER,                    -- NULL = unlimited
  max_uses_per_user SMALLINT     NOT NULL DEFAULT 1,
  uses_count       INTEGER       NOT NULL DEFAULT 0,
  valid_from       TIMESTAMPTZ   NOT NULL,
  valid_until      TIMESTAMPTZ   NOT NULL,
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coupons_code_idx
  ON coupons(code) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID        NOT NULL REFERENCES coupons(id),
  user_id     UUID        NOT NULL REFERENCES users(id),
  order_id    UUID        NOT NULL,             -- FK added after orders table created below
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevents double-redemption per user per coupon
CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_user_coupon_idx
  ON coupon_redemptions(user_id, coupon_id);

-- =============================================================================
-- order_status ENUM
-- LLD Delta A2: adds PAYMENT_PENDING + PAYMENT_FAILED (8 → 10 values)
-- State machine flow:
--   PLACED → PAYMENT_PENDING → CONFIRMED → PACKED → SHIPPED → DELIVERED
--   Any state → CANCELLED (COD: within 30min window)
--   DELIVERED → RETURN_REQUESTED → RETURNED
--   PLACED/CONFIRMED → PAYMENT_FAILED
-- =============================================================================

CREATE TYPE IF NOT EXISTS order_status AS ENUM (
  'PLACED',
  'PAYMENT_PENDING',
  'PAYMENT_FAILED',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED'
);

CREATE TYPE IF NOT EXISTS payment_method_type AS ENUM ('UPI', 'CARD', 'NETBANKING', 'COD');

-- =============================================================================
-- orders
-- =============================================================================

CREATE TABLE IF NOT EXISTS orders (
  id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID                NOT NULL REFERENCES users(id),
  status              order_status        NOT NULL DEFAULT 'PLACED',
  payment_method      payment_method_type NOT NULL,
  subtotal            NUMERIC(10,2)       NOT NULL,
  discount_amount     NUMERIC(10,2)       NOT NULL DEFAULT 0,
  -- A4 (Delta): gst_amount = SUM of per-order_item gst_amount values
  -- GST slab determined per unit_price, NOT order total (Indian GST Chapter 62)
  gst_amount          NUMERIC(10,2)       NOT NULL DEFAULT 0,
  total_amount        NUMERIC(10,2)       NOT NULL,
  coupon_id           UUID                REFERENCES coupons(id),
  shiprocket_order_id VARCHAR(100),
  tracking_url        TEXT,
  is_cod_confirmed    BOOLEAN             NOT NULL DEFAULT false,
  -- COD confirmation window: PLACED + 30 minutes
  cod_confirm_by      TIMESTAMPTZ,
  -- Set true when user has ≥2 cancelled COD orders → queued for fraud review
  cod_fraud_flag      BOOLEAN             NOT NULL DEFAULT false,
  replacement_of      UUID                REFERENCES orders(id),
  notes               TEXT,
  created_at          TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ         NOT NULL DEFAULT now()
  -- NOTE: No is_deleted on orders. Orders are never soft-deleted.
  -- Cancellation uses status='CANCELLED'. DPDPA: user anonymisation deletes user record,
  -- but order history is retained for financial compliance (7-year GST rule).
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx    ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx     ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);

-- Now add FK from coupon_redemptions.order_id to orders
ALTER TABLE coupon_redemptions
  ADD CONSTRAINT IF NOT EXISTS coupon_redemptions_order_id_fk
  FOREIGN KEY (order_id) REFERENCES orders(id);

-- =============================================================================
-- order_items
-- LLD Delta A4: unit_price stored per item; GST rate determined by unit_price
-- slab (per Indian GST Chapter 62 rules), not order total.
-- GST slabs (enforced in OrderService, recorded here at order time):
--   unit_price <= 999  → 0%  (0.00)
--   unit_price <= 1499 → 5%  (0.05)
--   unit_price >= 1500 → 12% (0.12)
-- =============================================================================

CREATE TABLE IF NOT EXISTS order_items (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID          NOT NULL REFERENCES orders(id),
  variant_id          UUID          NOT NULL REFERENCES variants(id),
  product_id          UUID          NOT NULL REFERENCES products(id),
  quantity            SMALLINT      NOT NULL CHECK (quantity > 0),
  -- unit_price: locked at order placement time via getEffectivePrice()
  -- RULE 1: Client-sent prices are NEVER used here
  unit_price          NUMERIC(10,2) NOT NULL,
  -- gst_rate: determined by unit_price slab (not order total) — Indian GST Chapter 62
  gst_rate            NUMERIC(5,4)  NOT NULL,   -- e.g. 0.05 for 5%, 0.12 for 12%
  gst_amount          NUMERIC(10,2) NOT NULL,
  delivery_address_id UUID          NOT NULL REFERENCES addresses(id),
  gift_note           TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_variant_id_idx ON order_items(variant_id);

-- =============================================================================
-- stock_adjustments (INSERT-ONLY)
-- INSERT-ONLY at repository layer: StockAdjustmentRepository has no update()
-- or delete() methods. reason NOT NULL enforced at both DB and API level.
-- Always uses SELECT ... FOR UPDATE in the same transaction (row-level lock).
-- =============================================================================

CREATE TYPE IF NOT EXISTS adjustment_reason AS ENUM (
  'damaged',
  'miscounted',
  'theft',
  'return_restocked',
  'supplier_short_shipped',
  'initial_stock',
  'correction',
  'other'
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  UUID              NOT NULL REFERENCES variants(id),
  before_qty  INTEGER           NOT NULL,
  after_qty   INTEGER           NOT NULL CHECK (after_qty >= 0),
  -- reason NOT NULL: enforced at DB level AND validated by Zod schema at API level
  reason      adjustment_reason NOT NULL,
  notes       TEXT,
  adjusted_by UUID              NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- INSERT-ONLY at Repository layer. No UPDATE or DELETE methods exist.
CREATE INDEX IF NOT EXISTS stock_adjustments_variant_id_idx
  ON stock_adjustments(variant_id, created_at DESC);

-- =============================================================================
-- expected_stock
-- =============================================================================

CREATE TABLE IF NOT EXISTS expected_stock (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id    UUID        NOT NULL REFERENCES variants(id),
  expected_qty  INTEGER     NOT NULL CHECK (expected_qty > 0),
  expected_date DATE        NOT NULL,
  notes         TEXT,
  is_received   BOOLEAN     NOT NULL DEFAULT false,
  received_at   TIMESTAMPTZ,
  created_by    UUID        NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial index: only active (not yet received) expected deliveries
CREATE INDEX IF NOT EXISTS expected_stock_date_idx
  ON expected_stock(expected_date) WHERE is_received = false;

-- =============================================================================
-- cart_items (LLD Delta A1 — new table for logged-in user persistent cart)
-- Guest users: Redis key cart:guest:{sessionId} TTL 7 days (unchanged)
-- On login: merge Redis guest cart into this table, then DEL Redis key
-- ADD pattern: INSERT ... ON CONFLICT (user_id, variant_id)
--              DO UPDATE SET quantity = LEAST(cart_items.quantity + excluded.quantity, 10)
-- REMOVE: DELETE WHERE user_id = $1 AND variant_id = $2
-- CLEAR: DELETE WHERE user_id = $1
-- =============================================================================

CREATE TABLE IF NOT EXISTS cart_items (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id),
  variant_id UUID        NOT NULL REFERENCES variants(id),
  -- quantity capped at 10 per item — enforced at API layer too (Zod schema)
  quantity   SMALLINT    NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 10),
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique: one row per user per variant (upsert pattern on conflict)
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_variant_idx
  ON cart_items(user_id, variant_id);

CREATE INDEX IF NOT EXISTS cart_items_user_id_idx
  ON cart_items(user_id);
