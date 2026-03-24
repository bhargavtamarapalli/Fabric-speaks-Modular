-- =============================================================================
-- Migration: 20250101000002_catalog.sql
-- Description: Catalog entities — brands, categories, products, variants
-- LLD Reference: Section 2.2 (Catalog Entities)
-- Rules: UUID PKs, GIN index on all JSONB columns, soft delete, forward-only
-- Depends on: 20250101000001_initial_schema.sql
-- =============================================================================

-- =============================================================================
-- brands
-- =============================================================================

CREATE TABLE IF NOT EXISTS brands (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(120) UNIQUE NOT NULL,
  story      TEXT,
  logo_url   TEXT,
  is_active  BOOLEAN      NOT NULL DEFAULT true,
  is_deleted BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brands_slug_idx
  ON brands(slug) WHERE is_deleted = false;

-- =============================================================================
-- categories (self-referencing parent_id for tree structure)
-- =============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(120) UNIQUE NOT NULL,
  parent_id     UUID         REFERENCES categories(id),   -- NULL = root category
  image_url     TEXT,
  seo_meta_json JSONB,
  display_order SMALLINT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  is_deleted    BOOLEAN      NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS categories_parent_id_idx
  ON categories(parent_id);

CREATE INDEX IF NOT EXISTS categories_slug_idx
  ON categories(slug) WHERE is_deleted = false;

-- GIN index on seo_meta_json JSONB
CREATE INDEX IF NOT EXISTS categories_seo_meta_gin
  ON categories USING GIN(seo_meta_json);

-- =============================================================================
-- products
-- =============================================================================

CREATE TABLE IF NOT EXISTS products (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          UUID         NOT NULL REFERENCES brands(id),
  category_id       UUID         NOT NULL REFERENCES categories(id),
  name              VARCHAR(200) NOT NULL,
  slug              VARCHAR(250) UNIQUE NOT NULL,
  description       TEXT,
  fabric_details    TEXT,
  care_guide        TEXT,
  -- JSONB attributes: {"fabric":"linen","gsm":180,"composition":"100% linen"}
  attributes        JSONB        NOT NULL DEFAULT '{}',
  -- Admin-set marketing badges: [{"type":"best_seller"},{"type":"premium"}]
  manual_badges_json JSONB,
  -- Self-referencing FK for duplicated products
  duplicate_of      UUID         REFERENCES products(id),
  is_active         BOOLEAN      NOT NULL DEFAULT true,
  is_deleted        BOOLEAN      NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_brand_id_idx
  ON products(brand_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS products_category_id_idx
  ON products(category_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS products_slug_idx
  ON products(slug) WHERE is_deleted = false;

-- GIN index on attributes JSONB — required for fabric/GSM filter queries
CREATE INDEX IF NOT EXISTS products_attributes_gin
  ON products USING GIN(attributes);

-- GIN index on manual_badges_json JSONB
CREATE INDEX IF NOT EXISTS products_manual_badges_gin
  ON products USING GIN(manual_badges_json);

-- Full-text search vector index (ts_vector) — used by Search Service (SRC-01)
-- Weighted: name (A), description (B), fabric_details (C)
CREATE INDEX IF NOT EXISTS products_fts_idx
  ON products USING GIN(
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(fabric_details, '')
    )
  );

-- =============================================================================
-- variants
-- Pricing precedence (enforced in service layer, not DB):
--   sale_active = true  → use sale_price
--   price_override IS NOT NULL → use price_override
--   else → use base_price
-- getEffectivePrice() in @fs/shared/pricing implements this logic.
-- RULE 1: Client-sent prices are NEVER trusted. Always recalculate server-side.
-- =============================================================================

CREATE TABLE IF NOT EXISTS variants (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID          NOT NULL REFERENCES products(id),
  sku           VARCHAR(100)  UNIQUE NOT NULL,     -- auto-generated: {BRAND_CODE}-{SIZE}-{COLOR_CODE}
  size          VARCHAR(20),
  colour        VARCHAR(50),
  size_label    VARCHAR(30),                        -- display label, e.g. 'M (38-40 in)'
  base_price    NUMERIC(10,2) NOT NULL CHECK (base_price > 0),
  price_override NUMERIC(10,2),                    -- optional override (no sale)
  sale_price    NUMERIC(10,2),                     -- discounted price when sale_active
  sale_active   BOOLEAN       NOT NULL DEFAULT false,
  qty           INTEGER       NOT NULL DEFAULT 0 CHECK (qty >= 0),
  -- Auto-computed display badges: ["New", "Sale", "Low Stock"]
  badges_json   JSONB,
  -- Array of CDN image URLs: [{"url":"...","alt":"...","isPrimary":true}]
  images_json   JSONB         NOT NULL DEFAULT '[]',
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  is_deleted    BOOLEAN       NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS variants_product_id_idx
  ON variants(product_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS variants_sku_idx
  ON variants(sku);

CREATE INDEX IF NOT EXISTS variants_sale_active_idx
  ON variants(sale_active) WHERE sale_active = true AND is_deleted = false;

-- GIN index on badges_json JSONB
CREATE INDEX IF NOT EXISTS variants_badges_gin
  ON variants USING GIN(badges_json);

-- GIN index on images_json JSONB
CREATE INDEX IF NOT EXISTS variants_images_gin
  ON variants USING GIN(images_json);













