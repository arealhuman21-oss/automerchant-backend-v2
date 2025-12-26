-- Check what's in the analysis_schedule table
SELECT
  user_id,
  next_analysis_due,
  last_analysis_run,
  NOW() as current_time,
  EXTRACT(EPOCH FROM (next_analysis_due - NOW())) as seconds_remaining,
  CASE
    WHEN next_analysis_due < NOW() THEN 'EXPIRED'
    WHEN next_analysis_due > NOW() THEN 'ACTIVE'
  END as status
FROM analysis_schedule
ORDER BY user_id;

-- Also check which user is benjamincao98@gmail.com
SELECT id, email, approved
FROM users
WHERE email = 'benjamincao98@gmail.com';
