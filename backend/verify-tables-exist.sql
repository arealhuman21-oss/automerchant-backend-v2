-- Verification Query: Check if timer tables exist
-- Run this in Supabase SQL Editor after migration

SELECT
  'manual_analyses' as table_name,
  COUNT(*) as row_count,
  'Tracks daily manual analysis limit (10/day)' as purpose
FROM manual_analyses

UNION ALL

SELECT
  'analysis_schedule' as table_name,
  COUNT(*) as row_count,
  'Tracks next auto-analysis time (30min timer)' as purpose
FROM analysis_schedule;

-- If both queries return without error, the tables exist!
-- Row count will be 0 initially (tables are empty until first use)
