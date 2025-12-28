-- ============================================
-- Migration 008: Enable Row Level Security (RLS)
-- Date: 2025-12-27
-- Description: CRITICAL - Enable RLS to prevent users from accessing each other's data
-- ============================================

-- This migration enables Row Level Security on all tables and creates policies
-- that enforce data isolation at the database level.

-- IMPORTANT: This requires switching from SERVICE_KEY to ANON_KEY
-- SERVICE_KEY bypasses RLS, ANON_KEY enforces it

-- ============================================
-- HELPER FUNCTION: Get user_id from JWT claims
-- ============================================

-- Create a function to extract user_id from JWT claims
-- This works with custom JWT tokens that have the structure: { "id": 123, "email": "..." }
-- Created in 'public' schema (we don't have permission for 'auth' schema)
CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS INTEGER AS $$
  SELECT COALESCE(
    -- Try to get 'id' from JWT claims (our custom JWT structure)
    NULLIF(current_setting('request.jwt.claims', true)::json->>'id', '')::INTEGER,
    -- Fallback to 'user_id' if present (future compatibility)
    NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::INTEGER,
    -- Fallback to 'sub' (standard JWT claim)
    NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::INTEGER
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- IMPORTANT SETUP REQUIRED:
-- For RLS to work with custom JWT tokens, you must configure Supabase:
--
-- 1. Go to Supabase Dashboard > Settings > API > JWT Settings
-- 2. Set JWT Secret to match your JWT_SECRET environment variable
-- 3. This allows Supabase to verify and parse your custom JWT tokens
--
-- Without this configuration, RLS policies will not be able to identify the user!

-- ============================================
-- 1. USERS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own record
CREATE POLICY "Users can read own record"
  ON users
  FOR SELECT
  USING (id = public.current_user_id());

-- Policy: Users can update their own record
CREATE POLICY "Users can update own record"
  ON users
  FOR UPDATE
  USING (id = public.current_user_id())
  WITH CHECK (id = public.current_user_id());

-- Policy: Allow INSERT for new user registration (public)
-- This allows the signup process to work
CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 2. SHOPS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read shops linked to their account
CREATE POLICY "Users can read own shops"
  ON shops
  FOR SELECT
  USING (user_id = public.current_user_id());

-- Policy: Users can update their own shops
CREATE POLICY "Users can update own shops"
  ON shops
  FOR UPDATE
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- Policy: Allow INSERT for OAuth installations
-- The user_id will be set during OAuth callback
CREATE POLICY "Allow shop installation"
  ON shops
  FOR INSERT
  WITH CHECK (user_id = public.current_user_id() OR user_id IS NULL);

-- ============================================
-- 3. PRODUCTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own products
CREATE POLICY "Users can read own products"
  ON products
  FOR SELECT
  USING (user_id = public.current_user_id());

-- Policy: Users can update their own products
CREATE POLICY "Users can update own products"
  ON products
  FOR UPDATE
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- Policy: Users can insert their own products
CREATE POLICY "Users can insert own products"
  ON products
  FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

-- Policy: Users can delete their own products
CREATE POLICY "Users can delete own products"
  ON products
  FOR DELETE
  USING (user_id = public.current_user_id());

-- ============================================
-- 4. RECOMMENDATIONS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own recommendations
CREATE POLICY "Users can read own recommendations"
  ON recommendations
  FOR SELECT
  USING (user_id = public.current_user_id());

-- Policy: Users can update their own recommendations
CREATE POLICY "Users can update own recommendations"
  ON recommendations
  FOR UPDATE
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- Policy: Users can insert their own recommendations
CREATE POLICY "Users can insert own recommendations"
  ON recommendations
  FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

-- Policy: Users can delete their own recommendations
CREATE POLICY "Users can delete own recommendations"
  ON recommendations
  FOR DELETE
  USING (user_id = public.current_user_id());

-- ============================================
-- 5. PRICE_CHANGES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE price_changes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own price changes
CREATE POLICY "Users can read own price_changes"
  ON price_changes
  FOR SELECT
  USING (user_id = public.current_user_id());

-- Policy: Users can insert their own price changes
CREATE POLICY "Users can insert own price_changes"
  ON price_changes
  FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

-- ============================================
-- 6. ANALYSIS_SCHEDULE TABLE
-- ============================================

-- Enable RLS
ALTER TABLE analysis_schedule ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own schedule
CREATE POLICY "Users can read own schedule"
  ON analysis_schedule
  FOR SELECT
  USING (user_id = public.current_user_id());

-- Policy: Users can update their own schedule
CREATE POLICY "Users can update own schedule"
  ON analysis_schedule
  FOR UPDATE
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- Policy: Users can insert their own schedule
CREATE POLICY "Users can insert own schedule"
  ON analysis_schedule
  FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

-- Policy: Users can delete their own schedule
CREATE POLICY "Users can delete own schedule"
  ON analysis_schedule
  FOR DELETE
  USING (user_id = public.current_user_id());

-- ============================================
-- 7. MANUAL_ANALYSES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE manual_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own manual analyses
CREATE POLICY "Users can read own manual_analyses"
  ON manual_analyses
  FOR SELECT
  USING (user_id = public.current_user_id());

-- Policy: Users can insert their own manual analyses
CREATE POLICY "Users can insert own manual_analyses"
  ON manual_analyses
  FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

-- ============================================
-- 8. OAUTH_STATES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read oauth states during OAuth flow
-- This is safe because:
-- 1. States are one-time use (deleted after verification)
-- 2. They don't contain sensitive data
-- 3. They expire after 10 minutes
-- 4. The verify_oauth_state function validates shop_domain match
CREATE POLICY "Allow oauth state read during flow"
  ON oauth_states
  FOR SELECT
  USING (true);

-- Policy: Allow oauth state creation during flow
CREATE POLICY "Allow oauth state creation"
  ON oauth_states
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow oauth state deletion during verification
CREATE POLICY "Allow oauth state deletion"
  ON oauth_states
  FOR DELETE
  USING (true);

-- ============================================
-- 9. V3 ALGORITHM TABLES (if they exist)
-- ============================================

-- Only create these if the tables exist
DO $$
BEGIN
  -- regret_budgets
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'regret_budgets') THEN
    ALTER TABLE regret_budgets ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can read own regret_budgets"
      ON regret_budgets FOR SELECT
      USING (user_id = public.current_user_id());

    CREATE POLICY "Users can modify own regret_budgets"
      ON regret_budgets FOR ALL
      USING (user_id = public.current_user_id())
      WITH CHECK (user_id = public.current_user_id());
  END IF;

  -- elasticity_learners
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'elasticity_learners') THEN
    ALTER TABLE elasticity_learners ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can read own elasticity_learners"
      ON elasticity_learners FOR SELECT
      USING (user_id = public.current_user_id());

    CREATE POLICY "Users can modify own elasticity_learners"
      ON elasticity_learners FOR ALL
      USING (user_id = public.current_user_id())
      WITH CHECK (user_id = public.current_user_id());
  END IF;

  -- price_change_observations
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'price_change_observations') THEN
    ALTER TABLE price_change_observations ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can read own observations"
      ON price_change_observations FOR SELECT
      USING (user_id = public.current_user_id());

    CREATE POLICY "Users can modify own observations"
      ON price_change_observations FOR ALL
      USING (user_id = public.current_user_id())
      WITH CHECK (user_id = public.current_user_id());
  END IF;

  -- regret_decision_history
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'regret_decision_history') THEN
    ALTER TABLE regret_decision_history ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can read own regret_history"
      ON regret_decision_history FOR SELECT
      USING (user_id = public.current_user_id());

    CREATE POLICY "Users can modify own regret_history"
      ON regret_decision_history FOR ALL
      USING (user_id = public.current_user_id())
      WITH CHECK (user_id = public.current_user_id());
  END IF;

  -- v3_recommendations_metadata (no user_id, uses recommendation_id)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'v3_recommendations_metadata') THEN
    ALTER TABLE v3_recommendations_metadata ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can read own v3_metadata"
      ON v3_recommendations_metadata FOR SELECT
      USING (
        recommendation_id IN (
          SELECT id FROM recommendations WHERE user_id = public.current_user_id()
        )
      );

    CREATE POLICY "Users can modify own v3_metadata"
      ON v3_recommendations_metadata FOR ALL
      USING (
        recommendation_id IN (
          SELECT id FROM recommendations WHERE user_id = public.current_user_id()
        )
      )
      WITH CHECK (
        recommendation_id IN (
          SELECT id FROM recommendations WHERE user_id = public.current_user_id()
        )
      );
  END IF;

END $$;

-- ============================================
-- 10. SHOPIFY_APPS TABLE
-- ============================================

-- Enable RLS on shopify_apps if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'shopify_apps') THEN
    ALTER TABLE shopify_apps ENABLE ROW LEVEL SECURITY;

    -- Allow public read for app listings
    CREATE POLICY "Allow public read of shopify apps"
      ON shopify_apps FOR SELECT
      USING (true);
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Run this to verify RLS is enabled on all tables:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- ============================================
-- Migration Complete
-- ============================================

-- NEXT STEPS:
-- 1. Update backend/config/database.js to use SUPABASE_ANON_KEY instead of SUPABASE_SERVICE_KEY
-- 2. Update Supabase client to pass JWT token with each request
-- 3. Test that users can only see their own data
