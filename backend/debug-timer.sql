-- Debug Timer Issue
-- Run this in Supabase SQL Editor

-- 1. Check all users
SELECT id, email, approved
FROM users
ORDER BY id;

-- 2. Check analysis schedules
SELECT
  user_id,
  next_analysis_due,
  last_analysis_run,
  EXTRACT(EPOCH FROM (next_analysis_due - NOW())) as seconds_until_next,
  created_at
FROM analysis_schedule
ORDER BY user_id;

-- 3. Check if schedules match approved users
SELECT
  u.id as user_id,
  u.email,
  u.approved,
  s.next_analysis_due,
  CASE
    WHEN s.next_analysis_due IS NULL THEN 'NO SCHEDULE'
    WHEN s.next_analysis_due < NOW() THEN 'EXPIRED'
    ELSE 'ACTIVE'
  END as schedule_status
FROM users u
LEFT JOIN analysis_schedule s ON u.id = s.user_id
WHERE u.approved = true
ORDER BY u.id;
