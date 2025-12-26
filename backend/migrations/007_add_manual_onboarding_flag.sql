-- ============================================
-- Migration 007: Add Manual Onboarding Flag
-- Date: 2025-12-21
-- Description: Track if user clicked manual onboarding button
-- ============================================

-- Add wants_manual_onboarding column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS wants_manual_onboarding BOOLEAN DEFAULT FALSE;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_users_manual_onboarding
ON users(wants_manual_onboarding)
WHERE wants_manual_onboarding = TRUE;

-- ============================================
-- Migration Complete
-- ============================================
