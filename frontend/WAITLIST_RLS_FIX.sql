-- ============================================
-- WAITLIST RLS POLICIES FIX
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable RLS on waitlist_emails table
ALTER TABLE waitlist_emails ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public inserts for waitlist" ON waitlist_emails;
DROP POLICY IF EXISTS "Allow inserts for signed-in users" ON waitlist_emails;
DROP POLICY IF EXISTS "Allow read of waitlist count" ON waitlist_emails;

-- Allow anonymous users to insert (for pre-OAuth scenarios)
CREATE POLICY "Allow public inserts for waitlist"
ON waitlist_emails
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users to insert (for post-OAuth scenarios)
CREATE POLICY "Allow inserts for signed-in users"
ON waitlist_emails
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow both anon and authenticated users to read for count queries
CREATE POLICY "Allow read of waitlist count"
ON waitlist_emails
FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================
-- WAITLIST METRICS TABLE (if not exists)
-- ============================================

-- Create waitlist_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS waitlist_metrics (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_signups INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on waitlist_metrics
ALTER TABLE waitlist_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow read of metrics" ON waitlist_metrics;
DROP POLICY IF EXISTS "Allow update of metrics" ON waitlist_metrics;

-- Allow anyone to read metrics
CREATE POLICY "Allow read of metrics"
ON waitlist_metrics
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow authenticated users to update metrics
CREATE POLICY "Allow update of metrics"
ON waitlist_metrics
FOR UPDATE
TO authenticated
USING (true);

-- Insert initial row if not exists
INSERT INTO waitlist_metrics (id, total_signups)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INCREMENT FUNCTION (if not exists)
-- ============================================

-- Create or replace the increment function
CREATE OR REPLACE FUNCTION increment_waitlist()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE waitlist_metrics
  SET total_signups = total_signups + 1,
      updated_at = NOW()
  WHERE id = 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_waitlist() TO anon, authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify everything is set up correctly:

-- 1. Check policies
-- SELECT * FROM pg_policies WHERE tablename IN ('waitlist_emails', 'waitlist_metrics');

-- 2. Check current count
-- SELECT * FROM waitlist_metrics WHERE id = 1;

-- 3. Test count query (what frontend will use)
-- SELECT COUNT(*) FROM waitlist_emails;
