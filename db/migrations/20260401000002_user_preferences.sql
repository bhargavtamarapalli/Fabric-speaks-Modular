-- =============================================================================
-- Migration: 20260401000002_user_preferences.sql
-- Description: Add a flexible preferences column for UI/Regional settings
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
