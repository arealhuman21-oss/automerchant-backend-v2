-- Delete all manual_analyses for user 7
DELETE FROM manual_analyses WHERE user_id = 7;

-- Verify deletion
SELECT COUNT(*) as remaining_count FROM manual_analyses WHERE user_id = 7;
