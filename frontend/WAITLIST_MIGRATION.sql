-- ============================================
-- WAITLIST TABLE MIGRATION - EMAIL ONLY
-- ============================================
-- This script simplifies the waitlist to collect only email addresses
-- Run this in Supabase SQL Editor

-- Drop existing columns if they exist
ALTER TABLE waitlist_emails
DROP COLUMN IF EXISTS name,
DROP COLUMN IF EXISTS shop_url;

-- Verify the table structure
-- Should only have: id, email, created_at
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'waitlist_emails'
ORDER BY ordinal_position;

-- Test: Verify RLS policies still work
-- Should return the existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'waitlist_emails';

-- Optional: If you want to start fresh, uncomment and run this instead:
/*
DROP TABLE IF EXISTS waitlist_emails CASCADE;

CREATE TABLE waitlist_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE waitlist_emails ENABLE ROW LEVEL SECURITY;

-- Create policy for public inserts
CREATE POLICY "Allow inserts for anon users" ON waitlist_emails
FOR INSERT TO anon WITH CHECK (true);
*/
