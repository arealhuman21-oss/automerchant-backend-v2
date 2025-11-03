# Google OAuth Setup for AutoMerchant Waitlist

Follow these steps to enable Google OAuth authentication for your Supabase-powered waitlist.

## Prerequisites
- Supabase account with access to your project
- Google Cloud Console account

## Step 1: Configure Google OAuth in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: AutoMerchant
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `email` and `profile` scopes
   - Save and continue

6. Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: AutoMerchant Waitlist
   - Authorized JavaScript origins:
     - `https://mfuqxntaivvqiajfgjtv.supabase.co` (your Supabase project URL)
     - `https://automerchant.vercel.app` (your frontend URL)
     - `http://localhost:3000` (for local testing)
   - Authorized redirect URIs:
     - `https://mfuqxntaivvqiajfgjtv.supabase.co/auth/v1/callback`
     - `https://automerchant.vercel.app` (your frontend URL)
     - `http://localhost:3000` (for local testing)

7. Click **Create** and save your:
   - Client ID
   - Client Secret

## Step 2: Enable Google Provider in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com/project/mfuqxntaivvqiajfgjtv
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the provider list
4. Toggle it to **Enabled**
5. Enter your Google OAuth credentials:
   - Client ID: (from Step 1)
   - Client Secret: (from Step 1)
6. Click **Save**

## Step 3: Verify Redirect URL

Make sure the following redirect URL is added in Google Cloud Console:
```
https://mfuqxntaivvqiajfgjtv.supabase.co/auth/v1/callback
```

## Step 4: Test the Integration

1. Deploy your frontend changes
2. Open the waitlist modal
3. Click "Sign in with Google"
4. You should be redirected to Google's OAuth consent screen
5. After authorizing, you'll be redirected back to your app
6. The email will be automatically added to the waitlist

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Verify all redirect URIs match exactly in both Google Cloud Console and Supabase
- Make sure there are no trailing slashes

### Error: "Invalid OAuth client"
- Double-check your Client ID and Client Secret in Supabase
- Ensure the Google OAuth consent screen is published

### Dev Whitelist Not Working
- The dev email `arealhuman21@gmail.com` is checked after authentication
- If authenticated with this email, you'll be redirected to the dashboard

## Environment Variables

Make sure these are set in Vercel:
```
REACT_APP_SUPABASE_URL=https://mfuqxntaivvqiajfgjtv.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdXF4bnRhaXZ2cWlhamZnanR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTY5ODcsImV4cCI6MjA3NzU5Mjk4N30.RDI3p5xnlq3VNNkNzUQVi_xCUTkPBdqYbUrjve71E44
```

## How It Works

1. User clicks "Sign in with Google" on the waitlist modal
2. Supabase redirects to Google OAuth consent screen
3. User authorizes the app
4. Google redirects back to your app with an auth code
5. Supabase exchanges the code for a user token
6. Your app receives the authenticated user's email
7. The email is automatically added to the `waitlist_emails` table
8. User sees success message with their signup number

## Database Schema

The waitlist table should have:
```sql
CREATE TABLE waitlist_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

The counter is maintained in:
```sql
CREATE TABLE waitlist_metrics (
  id INT PRIMARY KEY,
  total_signups INT DEFAULT 0
);

-- Insert initial row
INSERT INTO waitlist_metrics (id, total_signups) VALUES (1, 0);

-- Function to increment counter
CREATE OR REPLACE FUNCTION increment_waitlist()
RETURNS void AS $$
BEGIN
  UPDATE waitlist_metrics SET total_signups = total_signups + 1 WHERE id = 1;
END;
$$ LANGUAGE plpgsql;
```
