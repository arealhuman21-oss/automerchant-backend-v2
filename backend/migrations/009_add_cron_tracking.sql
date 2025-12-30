-- ============================================
-- Migration 009: Add Cron Job Tracking Table
-- ============================================
-- Purpose: Track system cron job executions to prevent rapid-fire abuse
-- Date: 2025-12-29
-- ============================================

-- Create system_cron_runs table to track when cron jobs last ran
CREATE TABLE IF NOT EXISTS system_cron_runs (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(100) UNIQUE NOT NULL,
  last_run_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on job_name for fast lookups
CREATE INDEX IF NOT EXISTS idx_system_cron_runs_job_name ON system_cron_runs(job_name);

-- Insert initial row for auto-analysis job (set to NULL so first run isn't blocked)
INSERT INTO system_cron_runs (job_name, last_run_at)
VALUES ('auto-analysis', NOW() - INTERVAL '30 minutes')
ON CONFLICT (job_name) DO NOTHING;

-- Add comment
COMMENT ON TABLE system_cron_runs IS 'Tracks when system cron jobs last executed to prevent abuse';
COMMENT ON COLUMN system_cron_runs.job_name IS 'Unique identifier for the cron job (e.g., auto-analysis)';
COMMENT ON COLUMN system_cron_runs.last_run_at IS 'Timestamp of last successful execution';
