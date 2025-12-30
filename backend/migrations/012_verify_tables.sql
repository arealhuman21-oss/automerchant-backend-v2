-- Migration 012: Verify and create missing tables
-- Date: 2025-12-30
-- Description: Ensure all required tables exist

-- 1. Create manual_analyses table if it doesn't exist
CREATE TABLE IF NOT EXISTS manual_analyses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triggered_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient 24-hour rolling window queries
CREATE INDEX IF NOT EXISTS idx_manual_analyses_user_triggered
ON manual_analyses(user_id, triggered_at DESC);

-- 2. Create analysis_schedule table if it doesn't exist
CREATE TABLE IF NOT EXISTS analysis_schedule (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_analysis_run TIMESTAMP,
  next_analysis_due TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Handle the UNIQUE constraint separately (may already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'analysis_schedule_user_id_key'
  ) THEN
    ALTER TABLE analysis_schedule ADD CONSTRAINT analysis_schedule_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists
  NULL;
END $$;

-- Index for finding users with analysis due
CREATE INDEX IF NOT EXISTS idx_analysis_schedule_next_due
ON analysis_schedule(next_analysis_due)
WHERE next_analysis_due IS NOT NULL;

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_analysis_schedule_user
ON analysis_schedule(user_id);

-- 3. Create system_cron_runs table if it doesn't exist (for cron rate limiting)
CREATE TABLE IF NOT EXISTS system_cron_runs (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL UNIQUE,
  last_run_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Enable RLS on new tables (if not already enabled)
ALTER TABLE manual_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_schedule ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for manual_analyses (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'manual_analyses' AND policyname = 'Users can read own manual_analyses') THEN
    CREATE POLICY "Users can read own manual_analyses"
      ON manual_analyses FOR SELECT
      USING (user_id = public.current_user_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'manual_analyses' AND policyname = 'Users can insert own manual_analyses') THEN
    CREATE POLICY "Users can insert own manual_analyses"
      ON manual_analyses FOR INSERT
      WITH CHECK (user_id = public.current_user_id());
  END IF;
END $$;

-- 6. Create RLS policies for analysis_schedule (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analysis_schedule' AND policyname = 'Users can read own schedule') THEN
    CREATE POLICY "Users can read own schedule"
      ON analysis_schedule FOR SELECT
      USING (user_id = public.current_user_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analysis_schedule' AND policyname = 'Users can insert own schedule') THEN
    CREATE POLICY "Users can insert own schedule"
      ON analysis_schedule FOR INSERT
      WITH CHECK (user_id = public.current_user_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analysis_schedule' AND policyname = 'Users can update own schedule') THEN
    CREATE POLICY "Users can update own schedule"
      ON analysis_schedule FOR UPDATE
      USING (user_id = public.current_user_id())
      WITH CHECK (user_id = public.current_user_id());
  END IF;
END $$;

-- Verification query (run separately to check)
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('manual_analyses', 'analysis_schedule', 'system_cron_runs');
