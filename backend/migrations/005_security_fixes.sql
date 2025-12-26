-- ============================================
-- Migration 005: Security and Performance Fixes
-- Date: 2025-12-18
-- Description: Critical security fixes and performance improvements
-- ============================================

-- 1. Add unique constraint to prevent duplicate recommendations
ALTER TABLE recommendations
ADD CONSTRAINT unique_user_product_recommendation
UNIQUE (user_id, product_id);

-- 2. Add last_auto_analysis_at to users table for timer persistence
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_auto_analysis_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS auto_analysis_paused BOOLEAN DEFAULT FALSE;

-- 3. Add index for manual_analyses 24-hour rolling window queries
CREATE INDEX IF NOT EXISTS idx_manual_analyses_user_date
ON manual_analyses(user_id, triggered_at DESC);

-- 4. Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_products_user_selected
ON products(user_id, selected_for_analysis)
WHERE selected_for_analysis = true;

CREATE INDEX IF NOT EXISTS idx_recommendations_user_product
ON recommendations(user_id, product_id);

CREATE INDEX IF NOT EXISTS idx_price_changes_user_date
ON price_changes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shops_domain_active
ON shops(shop_domain)
WHERE is_active = true;

-- 5. Create atomic function for applying price changes (prevents race conditions)
CREATE OR REPLACE FUNCTION apply_price_change_atomic(
  p_product_id INTEGER,
  p_user_id INTEGER,
  p_rec_id INTEGER,
  p_old_price DECIMAL,
  p_new_price DECIMAL,
  p_cost_price DECIMAL,
  p_sales_30d INTEGER
) RETURNS void AS $$
DECLARE
  v_profit_impact DECIMAL;
BEGIN
  -- Calculate profit impact
  v_profit_impact := (p_new_price - p_cost_price - (p_old_price - p_cost_price)) * p_sales_30d;

  -- Update product price (with row lock)
  UPDATE products
  SET price = p_new_price, updated_at = NOW()
  WHERE id = p_product_id AND user_id = p_user_id;

  -- Log price change
  INSERT INTO price_changes (user_id, product_id, old_price, new_price, profit_impact, created_at)
  VALUES (p_user_id, p_product_id, p_old_price, p_new_price, v_profit_impact, NOW());

  -- Delete recommendation (ensures it only gets applied once)
  DELETE FROM recommendations
  WHERE id = p_rec_id AND user_id = p_user_id AND product_id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Create atomic function for manual analysis limit check (prevents concurrent bypass)
CREATE OR REPLACE FUNCTION check_and_increment_manual_analysis(
  p_user_id INTEGER,
  p_max_per_day INTEGER DEFAULT 10
) RETURNS TABLE(allowed BOOLEAN, used INTEGER, remaining INTEGER) AS $$
DECLARE
  v_count INTEGER;
  v_twenty_four_hours_ago TIMESTAMP;
BEGIN
  v_twenty_four_hours_ago := NOW() - INTERVAL '24 hours';

  -- Get current count with row lock to prevent race conditions
  SELECT COUNT(*) INTO v_count
  FROM manual_analyses
  WHERE user_id = p_user_id
    AND triggered_at >= v_twenty_four_hours_ago
  FOR UPDATE;

  -- Check limit
  IF v_count >= p_max_per_day THEN
    RETURN QUERY SELECT FALSE, v_count, 0;
  ELSE
    -- Insert new record
    INSERT INTO manual_analyses (user_id, triggered_at)
    VALUES (p_user_id, NOW());

    RETURN QUERY SELECT TRUE, v_count + 1, p_max_per_day - (v_count + 1);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Add function to clean up old manual analysis records (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_manual_analyses() RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM manual_analyses
  WHERE triggered_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- 8. Add OAuth state tracking table for CSRF protection
CREATE TABLE IF NOT EXISTS oauth_states (
  id SERIAL PRIMARY KEY,
  nonce VARCHAR(255) UNIQUE NOT NULL,
  shop_domain VARCHAR(255) NOT NULL,
  app_id INTEGER,
  user_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- Index for quick lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_oauth_states_nonce ON oauth_states(nonce);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

-- 9. Function to verify and consume OAuth state (prevents replay attacks)
CREATE OR REPLACE FUNCTION verify_oauth_state(
  p_nonce VARCHAR(255),
  p_shop_domain VARCHAR(255)
) RETURNS TABLE(valid BOOLEAN, app_id INTEGER, user_email VARCHAR(255)) AS $$
DECLARE
  v_state RECORD;
BEGIN
  -- Find state with row lock
  SELECT * INTO v_state
  FROM oauth_states
  WHERE nonce = p_nonce
    AND expires_at > NOW()
  FOR UPDATE;

  -- Check if found and valid
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::VARCHAR;
  ELSIF v_state.shop_domain != p_shop_domain THEN
    -- Shop mismatch - delete state and return false
    DELETE FROM oauth_states WHERE nonce = p_nonce;
    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::VARCHAR;
  ELSE
    -- Valid - delete state (one-time use) and return data
    DELETE FROM oauth_states WHERE nonce = p_nonce;
    RETURN QUERY SELECT TRUE, v_state.app_id, v_state.user_email;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 10. Function to cleanup expired OAuth states (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states() RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM oauth_states WHERE expires_at < NOW();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (adjust role name as needed)
-- GRANT EXECUTE ON FUNCTION apply_price_change_atomic TO authenticated;
-- GRANT EXECUTE ON FUNCTION check_and_increment_manual_analysis TO authenticated;
-- GRANT EXECUTE ON FUNCTION verify_oauth_state TO authenticated;

-- ============================================
-- Migration Complete
-- ============================================
