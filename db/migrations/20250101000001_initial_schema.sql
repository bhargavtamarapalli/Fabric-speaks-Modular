-- =============================================================================
-- Migration: 20250101000001_initial_schema.sql
-- Description: Core user entities — users, addresses, consent_log
-- LLD Reference: Section 2.2 (Core Entities) + LLD Delta A7
-- Rules: UUID PKs on all PII entities, soft delete, TIMESTAMPTZ, forward-only
-- =============================================================================

-- =============================================================================
-- 2.2 Core Entities — users
-- LLD Delta A7: mobile_hash is a plain VARCHAR(64) column computed in the
-- application layer via HMAC-SHA256 with a secret from GCP Secret Manager.
-- It is NOT a GENERATED ALWAYS column — hardcoding the salt in the DDL
-- would expose it to anyone with schema access.
-- Compute in UserRepository: createHmac('sha256', MOBILE_HASH_SALT).update(mobile).digest('hex')
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile       VARCHAR(15) NOT NULL,
  -- A7: application-layer HMAC hash, populated by UserRepository on create/update
  -- Salt stored in GCP Secret Manager (MOBILE_HASH_SALT), never in DDL
  mobile_hash  VARCHAR(64),
  name         VARCHAR(100),
  email        VARCHAR(255),
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  role         VARCHAR(30)  NOT NULL DEFAULT 'customer'
                 CHECK (role IN ('customer', 'superAdmin', 'inventoryManager', 'supportAgent')),
  is_deleted   BOOLEAN      NOT NULL DEFAULT false,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Partial unique index: only one active record per mobile number
-- Deleted accounts (is_deleted=true) use sha256 hash as mobile — excluded from unique check
CREATE UNIQUE INDEX IF NOT EXISTS users_mobile_active_idx
  ON users(mobile) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS users_firebase_uid_idx ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS users_mobile_hash_idx  ON users(mobile_hash);

-- NOTE: mobile stored plaintext — required for OTP delivery via Firebase.
-- Logged only as maskMobile(mobile) = '07XXXXXXX99'. Never logged in full.
-- On DPDPA account deletion: mobile → sha256 hash, name/email → NULL, is_deleted = true.

-- =============================================================================
-- 2.2 Core Entities — addresses
-- =============================================================================

CREATE TABLE IF NOT EXISTS addresses (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id),
  label       VARCHAR(50),                     -- 'Home', 'Office', or custom
  full_name   VARCHAR(100) NOT NULL,
  mobile      VARCHAR(15)  NOT NULL,
  line1       TEXT         NOT NULL,
  line2       TEXT,
  city        VARCHAR(100) NOT NULL,
  state       VARCHAR(100) NOT NULL,
  pincode     VARCHAR(10)  NOT NULL,
  is_default  BOOLEAN      NOT NULL DEFAULT false,
  is_deleted  BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS addresses_user_id_idx
  ON addresses(user_id) WHERE is_deleted = false;

-- =============================================================================
-- 2.6 Notification Entities — consent_log (INSERT-ONLY)
-- CRITICAL: This table is INSERT-ONLY at the repository layer.
-- No UPDATE or DELETE methods exist on ConsentLogRepository.
-- Opt-out: INSERT a new row with opted_out_at set — previous rows stay intact.
-- Full audit timeline is preserved for TRAI + DPDPA compliance.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_channel') THEN
    CREATE TYPE consent_channel AS ENUM (
'whatsapp', 'email', 'sms', 'push'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_source') THEN
    CREATE TYPE consent_source AS ENUM (
'order_confirm', 'register', 'preferences_page', 'checkout', 'notify_me'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS consent_log (
  id                UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID             NOT NULL REFERENCES users(id),
  channel           consent_channel  NOT NULL,
  notification_type VARCHAR(100)     NOT NULL,
  opted_in_at       TIMESTAMPTZ      NOT NULL DEFAULT now(),
  opted_out_at      TIMESTAMPTZ,                -- NULL = still opted in
  ip_address        INET             NOT NULL,
  source            consent_source   NOT NULL,
  created_at        TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- CRITICAL: INSERT-ONLY. ConsentLogRepository has no update() or delete() methods.
-- Opt-out creates a new row with opted_out_at set — it DOES NOT modify the opt-in row.

CREATE INDEX IF NOT EXISTS consent_log_user_id_idx
  ON consent_log(user_id, channel, notification_type);

CREATE INDEX IF NOT EXISTS consent_log_opted_out_idx
  ON consent_log(user_id) WHERE opted_out_at IS NOT NULL;














