# 🚨 URGENT FIXES - Admin Panel & Waitlist

## Issue #1: Admin Panel 404 Errors ✅ FIXED

**Problem**: Admin panel calling `/admin/apps` instead of `/api/admin/apps`

**Fix Applied**: Updated `AdminPanel.jsx` line 6 to keep the full API URL

**Status**: ✅ Fixed in code, needs deployment

---

## Issue #2: Waitlist Supabase 406 Error ⚠️ NEEDS DATABASE FIX

**Problem**:
```
GET https://mfuqxntaivvqiajfgjtv.supabase.co/rest/v1/waitlist_emails 406 (Not Acceptable)
```

This is a **Supabase Row Level Security (RLS)** issue - the table exists but users can't read from it.

### Fix Steps (DO THIS NOW):

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: `mfuqxntaivvqiajfgjtv`
3. **Open SQL Editor** (left sidebar)
4. **Copy and paste this SQL**:

```sql
-- ============================================
-- WAITLIST RLS POLICIES FIX
-- ============================================

-- Enable RLS on waitlist_emails table
ALTER TABLE waitlist_emails ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public inserts for waitlist" ON waitlist_emails;
DROP POLICY IF EXISTS "Allow inserts for signed-in users" ON waitlist_emails;
DROP POLICY IF EXISTS "Allow read of waitlist count" ON waitlist_emails;
DROP POLICY IF EXISTS "Allow authenticated select" ON waitlist_emails;

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

-- Allow both anon and authenticated users to read/select
CREATE POLICY "Allow read of waitlist count"
ON waitlist_emails
FOR SELECT
TO anon, authenticated
USING (true);

-- CRITICAL: Allow authenticated users to check if their email exists
CREATE POLICY "Allow authenticated select"
ON waitlist_emails
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- WAITLIST METRICS TABLE
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
VALUES (1, (SELECT COUNT(*) FROM waitlist_emails))
ON CONFLICT (id) DO UPDATE SET total_signups = EXCLUDED.total_signups;

-- ============================================
-- INCREMENT FUNCTION
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
```

5. **Click "Run"** (or press Ctrl+Enter)
6. **Verify** - Run this to check:

```sql
-- Should return the policies
SELECT * FROM pg_policies WHERE tablename IN ('waitlist_emails', 'waitlist_metrics');

-- Should return current count
SELECT * FROM waitlist_metrics WHERE id = 1;
```

---

## Deployment Steps

After you run the SQL above:

```bash
cd C:\Users\ben_l\automerchant-local\frontend
vercel --prod
```

Wait ~30 seconds, then test at: **https://automerchant.vercel.app**

---

## Testing After Fixes

### 1. Test Admin Panel
1. Go to https://automerchant.vercel.app
2. Login as `arealhuman21@gmail.com`
3. Check console - should NOT see 404 errors
4. Admin panel tabs should load ✅

### 2. Test Waitlist
1. Logout
2. Click "Join the Waitlist"
3. Sign in with a different Google account
4. Should NOT see 406 error
5. Should see success message with signup number ✅

---

## Quick Commands

```bash
# Deploy frontend fix
cd C:\Users\ben_l\automerchant-local\frontend
vercel --prod

# Check deployment
curl https://automerchant-backend-v2.vercel.app/api/health
```

---

## Status

- ✅ Admin Panel fix: Code updated
- ⚠️  Waitlist fix: **RUN THE SQL ABOVE IN SUPABASE NOW**
- ⏳ Deployment: Pending
