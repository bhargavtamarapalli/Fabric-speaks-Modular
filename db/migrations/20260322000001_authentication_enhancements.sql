-- =============================================================================
-- Migration: 20260322000001_authentication_enhancements.sql
-- Description: Add support for Email/Password auth and optional mobile numbers
-- =============================================================================

-- 1. Make firebase_uid and mobile nullable to support different auth providers
ALTER TABLE users ALTER COLUMN firebase_uid DROP NOT NULL;
ALTER TABLE users ALTER COLUMN mobile DROP NOT NULL;

-- 2. Add password_hash and email_verified columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

-- 3. Ensure email is unique (across non-deleted users)
-- First, clean up any NULL emails if necessary (though users table usually starts empty or clean)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users(email) WHERE is_deleted = false AND email IS NOT NULL;

-- 4. Create refresh_tokens table for secure session management
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES users(id),
  token        VARCHAR(512) NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ  NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  revoked_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON refresh_tokens(token);













