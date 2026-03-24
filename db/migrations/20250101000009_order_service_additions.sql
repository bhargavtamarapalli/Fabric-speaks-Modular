-- Migration: 20250101000009_order_service_additions.sql
-- Description: Adds version to variants for OCC, gst_invoices table, order_status_history table

ALTER TABLE variants 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS gst_invoices (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID          NOT NULL REFERENCES orders(id),
  invoice_number VARCHAR(50)   UNIQUE NOT NULL, -- e.g. FS-2324-0001
  pdf_url        TEXT,
  total_amount   NUMERIC(10,2) NOT NULL,
  gst_amount     NUMERIC(10,2) NOT NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gst_invoices_order_id_idx ON gst_invoices(order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID          NOT NULL REFERENCES orders(id),
  status         order_status  NOT NULL,
  notes          TEXT,
  created_by     UUID          REFERENCES users(id), -- NULL if system/webhook
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_status_history_order_id_idx ON order_status_history(order_id);













