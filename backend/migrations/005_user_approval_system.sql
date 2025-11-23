-- ============================================
-- Migration: User Approval & Suspension System
-- ============================================
-- This migration adds approval/suspension functionality to the users table
-- and creates a user-to-app assignment system.
--
-- Purpose: Allow admin to approve waitlist users and assign them to specific Shopify apps
--
-- Run this migration: psql $DATABASE_URL -f backend/migrations/005_user_approval_system.sql

-- Add approval/suspension columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS assigned_app_id INTEGER REFERENCES shopify_apps(id) ON DELETE SET NULL;

-- Add approval/suspension columns to waitlist_emails table (Supabase)
-- Note: This is for reference - you need to run this in Supabase SQL editor
-- ALTER TABLE waitlist_emails
-- ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
-- ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT false,
-- ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
-- ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;

-- Create index for fast approval lookups
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);
CREATE INDEX IF NOT EXISTS idx_users_suspended ON users(suspended);
CREATE INDEX IF NOT EXISTS idx_users_assigned_app ON users(assigned_app_id);

-- Comments
COMMENT ON COLUMN users.approved IS 'Whether user has been approved by admin to access the product';
COMMENT ON COLUMN users.suspended IS 'Whether user has been suspended by admin';
COMMENT ON COLUMN users.approved_at IS 'Timestamp when user was approved';
COMMENT ON COLUMN users.suspended_at IS 'Timestamp when user was suspended';
COMMENT ON COLUMN users.assigned_app_id IS 'Shopify app assigned to this user (for data syncing)';
