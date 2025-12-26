-- ============================================
-- Migration 006: Add Auto-Analysis Tables
-- Date: 2025-12-19
-- Description: Create missing tables for auto-analysis timer feature
-- ============================================

-- 1. Create manual_analyses table to track daily manual analysis limit
CREATE TABLE IF NOT EXISTS manual_analyses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triggered_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient 24-hour rolling window queries
CREATE INDEX IF NOT EXISTS idx_manual_analyses_user_triggered
ON manual_analyses(user_id, triggered_at DESC);

-- 2. Create analysis_schedule table to track automatic analysis timing
CREATE TABLE IF NOT EXISTS analysis_schedule (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  last_analysis_run TIMESTAMP,
  next_analysis_due TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for finding users with analysis due
CREATE INDEX IF NOT EXISTS idx_analysis_schedule_next_due
ON analysis_schedule(next_analysis_due)
WHERE next_analysis_due IS NOT NULL;

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_analysis_schedule_user
ON analysis_schedule(user_id);

-- 3. Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analysis_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create it
DROP TRIGGER IF EXISTS analysis_schedule_updated_at ON analysis_schedule;

CREATE TRIGGER analysis_schedule_updated_at
BEFORE UPDATE ON analysis_schedule
FOR EACH ROW
EXECUTE FUNCTION update_analysis_schedule_timestamp();

-- ============================================
-- Migration Complete
-- ============================================
