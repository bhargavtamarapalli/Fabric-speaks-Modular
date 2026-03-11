-- =============================================================================
-- Migration: 20250101000005_collections_notifications.sql
-- Description: Content, operational & notification entities —
--              collections, collection_products, wishlists,
--              stock_notifications, consent channel types (declared in 0001),
--              notification_log, admin_audit_log,
--              plus supporting tables: banners, reviews, content_pages,
--              nav_items, homepage_config, broadcast_campaigns,
--              broadcast_analytics, event_log
-- LLD Reference: Section 2.4 (Content), 2.5 (Operational), 2.6 (Notification),
--                2.7 (Admin)
-- Rules: UUID PKs, GIN on JSONB, soft-delete where applicable, forward-only
-- Depends on: 20250101000001_initial_schema.sql (users, consent_channel enum)
--             20250101000002_catalog.sql (products, variants)
--             20250101000003_orders.sql (orders)
-- =============================================================================

-- =============================================================================
-- 2.4 Content Entities — collections + collection_products
-- Smart collections: rules_json evaluated by CollectionService rule engine
-- Manual collections: curated product list via collection_products
-- =============================================================================

CREATE TYPE IF NOT EXISTS collection_type AS ENUM ('smart', 'manual');

CREATE TABLE IF NOT EXISTS collections (
  id                     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(150)    NOT NULL,
  slug                   VARCHAR(180)    UNIQUE NOT NULL,
  type                   collection_type NOT NULL DEFAULT 'smart',
  -- Smart collection rules: [{"field":"fabric_type","op":"eq","value":"linen"}]
  -- Evaluated by CollectionService.evaluateRules() — whitelist-only fields
  rules_json             JSONB,
  hero_image_mobile_url  TEXT,
  hero_image_desktop_url TEXT,
  description            TEXT,
  seo_meta_json          JSONB,
  -- Scheduled publish time (NULL = publish immediately when is_active=true)
  scheduled_at           TIMESTAMPTZ,
  is_active              BOOLEAN         NOT NULL DEFAULT true,
  is_deleted             BOOLEAN         NOT NULL DEFAULT false,
  created_by             UUID            REFERENCES users(id),
  created_at             TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collections_slug_idx
  ON collections(slug) WHERE is_deleted = false;

-- GIN index on rules_json for smart-collection rebuilds
CREATE INDEX IF NOT EXISTS collections_rules_gin
  ON collections USING GIN(rules_json);

-- GIN index on seo_meta_json
CREATE INDEX IF NOT EXISTS collections_seo_gin
  ON collections USING GIN(seo_meta_json);

-- collection_products join table (manual collections + display ordering)
-- SERIAL PK (not UUID) — sequential integer is fine for an ordering join table
-- ON DELETE CASCADE: removing collection removes its product links automatically
CREATE TABLE IF NOT EXISTS collection_products (
  id            SERIAL      PRIMARY KEY,
  collection_id UUID        NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id    UUID        NOT NULL REFERENCES products(id),
  display_order SMALLINT    NOT NULL DEFAULT 0,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate product entries per collection
CREATE UNIQUE INDEX IF NOT EXISTS collection_products_unique_idx
  ON collection_products(collection_id, product_id);

-- Ordered fetch for collection page render
CREATE INDEX IF NOT EXISTS collection_products_order_idx
  ON collection_products(collection_id, display_order);

-- =============================================================================
-- 2.4 Content Entities — content_pages
-- CMS-managed editorial pages (About Us, Fabric Guide, etc.)
-- body_html MUST be DOMPurify-sanitised before storage — enforced in service layer
-- =============================================================================

CREATE TYPE IF NOT EXISTS content_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE IF NOT EXISTS content_pages (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  title                VARCHAR(200)   NOT NULL,
  slug                 VARCHAR(250)   UNIQUE NOT NULL,
  body_html            TEXT,           -- DOMPurify-sanitised HTML; raw input rejected
  hero_image_url       TEXT,
  related_product_ids  JSONB          DEFAULT '[]',  -- array of product UUIDs
  seo_meta_json        JSONB,
  status               content_status NOT NULL DEFAULT 'draft',
  published_at         TIMESTAMPTZ,
  is_deleted           BOOLEAN        NOT NULL DEFAULT false,
  created_by           UUID           REFERENCES users(id),
  updated_by           UUID           REFERENCES users(id),
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_pages_slug_idx
  ON content_pages(slug) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS content_pages_status_idx
  ON content_pages(status) WHERE is_deleted = false;

-- GIN index on related_product_ids array for reverse lookups
CREATE INDEX IF NOT EXISTS content_pages_related_gin
  ON content_pages USING GIN(related_product_ids);

-- =============================================================================
-- 2.4 Content Entities — nav_items (header navigation tree)
-- Self-referencing parent_id supports nested nav dropdowns
-- Explicit invalidation: redis.del('nav:global') on every save
-- =============================================================================

CREATE TYPE IF NOT EXISTS nav_link_type AS ENUM ('category', 'collection', 'url');

CREATE TABLE IF NOT EXISTS nav_items (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  label           VARCHAR(100)  NOT NULL,
  link_type       nav_link_type NOT NULL,
  link_target     VARCHAR(255)  NOT NULL,  -- slug or absolute URL
  display_order   SMALLINT      NOT NULL DEFAULT 0,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  -- hex colour for "Sale" label styling, e.g. '#C0392B'
  highlight_color VARCHAR(7),
  parent_id       UUID          REFERENCES nav_items(id),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Ordered active-only fetch for nav render
CREATE INDEX IF NOT EXISTS nav_items_active_order_idx
  ON nav_items(display_order) WHERE is_active = true;

-- =============================================================================
-- 2.4 Content Entities — homepage_config
-- One row per section type (UNIQUE on section).
-- Explicit invalidation: redis.del('homepage:config') on admin save.
-- =============================================================================

CREATE TYPE IF NOT EXISTS homepage_section AS ENUM (
  'announcement_bar',
  'hero_banner',
  'shop_by_fabric',
  'new_arrivals',
  'featured_collection',
  'brand_spotlight',
  'fabric_story',
  'deal_of_day'
);

CREATE TABLE IF NOT EXISTS homepage_config (
  id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  section       homepage_section  UNIQUE NOT NULL,
  is_active     BOOLEAN           NOT NULL DEFAULT false,
  config_json   JSONB             NOT NULL DEFAULT '{}',
  display_order SMALLINT          NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_by    UUID              REFERENCES users(id)
);

-- GIN index on config_json for section-specific attribute queries
CREATE INDEX IF NOT EXISTS homepage_config_json_gin
  ON homepage_config USING GIN(config_json);

-- =============================================================================
-- 2.4 Content Entities — banners (promotional banners)
-- =============================================================================

CREATE TABLE IF NOT EXISTS banners (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             VARCHAR(200) NOT NULL,
  image_mobile_url  TEXT        NOT NULL,
  image_desktop_url TEXT        NOT NULL,
  link_url          TEXT,
  utm_params        TEXT,       -- appended to link_url for analytics
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ,
  is_active         BOOLEAN     NOT NULL DEFAULT false,
  created_by        UUID        REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fetch currently active banners efficiently
CREATE INDEX IF NOT EXISTS banners_active_idx
  ON banners(starts_at, ends_at) WHERE is_active = true;

-- =============================================================================
-- 2.5 Operational Entities — stock_notifications
-- "Notify me when back in stock" opt-ins per user + variant
-- UNIQUE partial index: only one active notification per user/variant pair
-- =============================================================================

CREATE TABLE IF NOT EXISTS stock_notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id),
  variant_id  UUID        NOT NULL REFERENCES variants(id),
  notified_at TIMESTAMPTZ,             -- NULL = not yet notified
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active alert per (user, variant). De-duplicate at DB level.
CREATE UNIQUE INDEX IF NOT EXISTS stock_notif_user_variant_idx
  ON stock_notifications(user_id, variant_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS stock_notif_variant_id_idx
  ON stock_notifications(variant_id) WHERE is_active = true AND notified_at IS NULL;

-- =============================================================================
-- 2.5 Operational Entities — wishlists
-- One row per (user, variant). Deletion is hard-delete (no soft-delete needed).
-- =============================================================================

CREATE TABLE IF NOT EXISTS wishlists (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id),
  variant_id UUID        NOT NULL REFERENCES variants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- De-duplicate at DB level
CREATE UNIQUE INDEX IF NOT EXISTS wishlists_user_variant_idx
  ON wishlists(user_id, variant_id);

CREATE INDEX IF NOT EXISTS wishlists_user_id_idx
  ON wishlists(user_id);

-- =============================================================================
-- 2.6 Notification Entities — notification_log
-- Records every outbound notification (email, SMS, WA, push).
-- Consent is checked via consent_log before any record is inserted here.
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_log (
  id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID            NOT NULL REFERENCES users(id),
  -- consent_channel enum declared in 20250101000001_initial_schema.sql
  channel      consent_channel NOT NULL,
  template_id  VARCHAR(100)    NOT NULL,
  -- 'queued' | 'sent' | 'delivered' | 'failed'
  status       VARCHAR(30)     NOT NULL,
  -- Meta WA message ID (delivery receipt tracking)
  wa_message_id VARCHAR(100),
  error_code   VARCHAR(50),
  sent_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Cursor-based pagination: user notification inbox (newest first)
CREATE INDEX IF NOT EXISTS notification_log_user_sent_idx
  ON notification_log(user_id, sent_at DESC);

-- =============================================================================
-- 2.6 Notification Entities — broadcast_campaigns + broadcast_analytics
-- Admin-initiated mass-send campaigns (WA / SMS / Email)
-- Analytics stored in a companion 1:1 table for easy columnar updates
-- =============================================================================

CREATE TYPE IF NOT EXISTS campaign_status AS ENUM (
  'draft',
  'scheduled',
  'sending',
  'sent',
  'failed'
);

CREATE TABLE IF NOT EXISTS broadcast_campaigns (
  id                   UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id          VARCHAR(100)    NOT NULL,
  audience_filter_json JSONB           NOT NULL DEFAULT '{}',
  message_preview      TEXT            NOT NULL,
  scheduled_at         TIMESTAMPTZ,
  sent_at              TIMESTAMPTZ,
  status               campaign_status NOT NULL DEFAULT 'draft',
  sent_by              UUID            NOT NULL REFERENCES users(id),
  created_at           TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS broadcast_campaigns_status_idx
  ON broadcast_campaigns(status, scheduled_at);

-- GIN index on audience_filter_json for segment rule queries
CREATE INDEX IF NOT EXISTS broadcast_campaigns_filter_gin
  ON broadcast_campaigns USING GIN(audience_filter_json);

CREATE TABLE IF NOT EXISTS broadcast_analytics (
  -- 1:1 with broadcast_campaigns
  campaign_id  UUID    PRIMARY KEY REFERENCES broadcast_campaigns(id),
  sent         INTEGER NOT NULL DEFAULT 0,
  delivered    INTEGER NOT NULL DEFAULT 0,
  read         INTEGER NOT NULL DEFAULT 0,
  clicked      INTEGER NOT NULL DEFAULT 0,
  converted    INTEGER NOT NULL DEFAULT 0,
  -- Users skipped due to frequency-cap rules
  capped       INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2.7 Admin Entities — admin_audit_log (INSERT-ONLY)
-- RULE 6: every admin mutation MUST call auditLog.insert() — enforced in services.
-- No UPDATE or DELETE methods on AuditLogRepository.
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID        NOT NULL REFERENCES users(id),
  -- e.g. 'product.deactivate', 'stock.adjust', 'variant.price_change'
  action      VARCHAR(100) NOT NULL,
  -- e.g. 'product', 'variant', 'order'
  entity_type VARCHAR(50)  NOT NULL,
  entity_id   UUID         NOT NULL,
  before_json JSONB,
  after_json  JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- INSERT-ONLY. AuditLogRepository has no update() or delete() methods.
CREATE INDEX IF NOT EXISTS audit_log_admin_id_idx
  ON admin_audit_log(admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx
  ON admin_audit_log(entity_type, entity_id);

-- GIN indexes on diff columns for targeted audit queries
CREATE INDEX IF NOT EXISTS audit_log_before_gin
  ON admin_audit_log USING GIN(before_json);

CREATE INDEX IF NOT EXISTS audit_log_after_gin
  ON admin_audit_log USING GIN(after_json);

-- =============================================================================
-- 2.7 Admin Entities — reviews
-- Tied to a specific order (verified purchase). is_approved gate prevents spam.
-- Soft-deleted reviews are excluded from product rating calculations.
-- =============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID     NOT NULL REFERENCES products(id),
  user_id     UUID     NOT NULL REFERENCES users(id),
  order_id    UUID     NOT NULL REFERENCES orders(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT,
  size_worn   VARCHAR(20),
  -- Tags like ['soft', 'true_to_size', 'runs_large']
  fabric_tags JSONB,
  -- Firebase Storage CDN paths for review photos
  photo_urls  JSONB,
  is_approved BOOLEAN  NOT NULL DEFAULT false,
  is_deleted  BOOLEAN  NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only approved, non-deleted reviews shown on PDP
CREATE INDEX IF NOT EXISTS reviews_product_id_idx
  ON reviews(product_id) WHERE is_approved = true AND is_deleted = false;

-- User-scoped review history
CREATE INDEX IF NOT EXISTS reviews_user_id_idx
  ON reviews(user_id) WHERE is_deleted = false;

-- One verified review per user per order (prevent duplicate submission)
CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_order_idx
  ON reviews(user_id, order_id) WHERE is_deleted = false;

-- GIN indexes on JSONB columns
CREATE INDEX IF NOT EXISTS reviews_fabric_tags_gin
  ON reviews USING GIN(fabric_tags);

CREATE INDEX IF NOT EXISTS reviews_photo_urls_gin
  ON reviews USING GIN(photo_urls);

-- =============================================================================
-- 2.7 Admin Entities — event_log (analytics / clickstream)
-- Partitioned by month in production. Retention: 2 years (data policy).
-- IP addresses MUST be hashed before storage (DPDPA compliance).
-- user_id is NULL for unauthenticated (guest) events.
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES users(id),  -- NULL = guest
  session_id   VARCHAR(100),
  -- view_product | add_to_cart | wishlist_add | purchase | search_term
  -- collection_view | content_page_view | notify_me_set | filter_used
  event_type   VARCHAR(60)  NOT NULL,
  entity_id    UUID,
  entity_type  VARCHAR(50),
  metadata_json JSONB,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- NOTE: Partitioned by month in production. Retention: 2 years.
-- IP addresses hashed in metadata_json before storage (DPDPA).
CREATE INDEX IF NOT EXISTS event_log_user_id_idx
  ON event_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS event_log_event_type_idx
  ON event_log(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS event_log_metadata_gin
  ON event_log USING GIN(metadata_json);
