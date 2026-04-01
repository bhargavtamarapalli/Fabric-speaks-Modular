-- =============================================================================
-- Migration: 20260401000003_add_whatsapp_enabled.sql
-- Description: Add WhatsApp notification setting to user profile
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;
