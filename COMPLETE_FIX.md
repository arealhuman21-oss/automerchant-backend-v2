# 🔧 Complete Fix for Both Issues

## Issue Summary

1. **Admin Panel 500 Error**: Backend can't query the database properly
2. **Waitlist Supabase Error**: Missing API key in requests

---

## Fix #1: Create Missing Database Tables

The admin panel is trying to query tables that might not exist yet!

### Run this SQL in Supabase:

```sql
-- Create shopify_apps table if it doesn't exist
CREATE TABLE IF NOT EXISTS shopify_apps (
  id SERIAL PRIMARY KEY,
  app_name TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  shop_domain TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  install_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create waitlist_emails table if it doesn't exist
CREATE TABLE IF NOT EXISTS waitlist_emails (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE shopify_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_emails ENABLE ROW LEVEL SECURITY;

-- Admin can do everything on shopify_apps
DROP POLICY IF EXISTS "Admin full access" ON shopify_apps;
CREATE POLICY "Admin full access"
ON shopify_apps
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Everyone can read shopify_apps (for install links)
DROP POLICY IF EXISTS "Public read access" ON shopify_apps;
CREATE POLICY "Public read access"
ON shopify_apps
FOR SELECT
TO anon, authenticated
USING (true);

-- Waitlist policies
DROP POLICY IF EXISTS "Allow authenticated select" ON waitlist_emails;
DROP POLICY IF EXISTS "Allow public inserts for waitlist" ON waitlist_emails;
DROP POLICY IF EXISTS "Allow inserts for signed-in users" ON waitlist_emails;

CREATE POLICY "Allow authenticated select"
ON waitlist_emails
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow public inserts for waitlist"
ON waitlist_emails
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create waitlist_metrics table
CREATE TABLE IF NOT EXISTS waitlist_metrics (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_signups INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE waitlist_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read of metrics" ON waitlist_metrics;
CREATE POLICY "Allow read of metrics"
ON waitlist_metrics
FOR SELECT
TO anon, authenticated
USING (true);

-- Initialize with current count
INSERT INTO waitlist_metrics (id, total_signups)
VALUES (1, (SELECT COUNT(*) FROM waitlist_emails))
ON CONFLICT (id) DO UPDATE SET total_signups = EXCLUDED.total_signups;

-- Create increment function
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

GRANT EXECUTE ON FUNCTION increment_waitlist() TO anon, authenticated;
```

---

## Fix #2: Verify Environment Variables

Make sure these are set in **Vercel** for your frontend project:

1. Go to https://vercel.com/dashboard
2. Select your `frontend` project
3. Go to **Settings** → **Environment Variables**
4. Verify these exist:

```
REACT_APP_SUPABASE_URL=https://mfuqxntaivvqiajfgjtv.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdXF4bnRhaXZ2cWlhamZnanR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTY5ODcsImV4cCI6MjA3NzU5Mjk4N30.RDI3p5xnlq3VNNkNzUQVi_xCUTkPBdqYbUrjve71E44
REACT_APP_API_URL=https://automerchant-backend-v2.vercel.app/api
```

If any are missing, add them and **redeploy**.

---

## Testing Steps

### 1. After Running SQL

Test the database directly in Supabase SQL Editor:

```sql
-- Should return empty array (no apps yet)
SELECT * FROM shopify_apps;

-- Should return your waitlist users
SELECT * FROM waitlist_emails;

-- Should return count
SELECT * FROM waitlist_metrics;
```

### 2. Test Admin Panel

1. Go to https://automerchant.vercel.app
2. Login as `arealhuman21@gmail.com`
3. Open browser console (F12)
4. You should see:
   - ✅ No 500 errors
   - ✅ Apps tab loads (empty is OK)
   - ✅ Users tab shows waitlist users

### 3. Test Waitlist

1. Logout
2. Click "Join the Waitlist"
3. Sign in with different Google account
4. You should see:
   - ✅ No "No API key found" error
   - ✅ Success message with signup number

---

## Quick Deploy

After running the SQL and verifying env vars:

```bash
cd C:\Users\ben_l\automerchant-local\frontend
vercel --prod
```

---

## What These Fixes Do

### Database Tables
- **shopify_apps**: Stores the Shopify apps you create for customers
- **waitlist_emails**: Stores email addresses from waitlist signups
- **waitlist_metrics**: Tracks total signup count

### Permissions (RLS Policies)
- Admin can read/write everything
- Authenticated users can insert to waitlist
- Everyone can read waitlist count

### Environment Variables
- Frontend needs Supabase credentials to talk to database
- Frontend needs backend API URL for admin panel

---

## Expected Results

After these fixes:

✅ Admin panel loads without errors
✅ You can add new Shopify apps
✅ You can see waitlist users
✅ New users can join waitlist
✅ No 406 or 500 errors

---

## Need Help?

If you still see errors after this:

1. **Check Vercel logs**: `vercel logs --prod` (in backend folder)
2. **Check browser console**: F12 in Chrome
3. **Check Supabase logs**: Supabase Dashboard → Logs

Tell me what error you see and I'll help debug further!
