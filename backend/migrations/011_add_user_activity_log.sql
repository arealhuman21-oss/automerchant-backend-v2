-- Migration 011: Add user activity log for comprehensive analytics
-- This table tracks all user actions for monitoring and analytics

-- Create the user_activity_log table
CREATE TABLE IF NOT EXISTS user_activity_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_user_action ON user_activity_log(user_id, action);

-- Add comments for documentation
COMMENT ON TABLE user_activity_log IS 'Tracks all user actions for analytics and monitoring';
COMMENT ON COLUMN user_activity_log.action IS 'Type of action: login, logout, sync_products, run_analysis, accept_recommendation, reject_recommendation, update_cost_price, apply_price, etc.';
COMMENT ON COLUMN user_activity_log.details IS 'JSON object with action-specific details';

-- Create a table for recommendation history (more detailed tracking)
CREATE TABLE IF NOT EXISTS recommendation_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  recommendation_id INTEGER,
  action VARCHAR(50) NOT NULL, -- 'created', 'accepted', 'rejected', 'expired', 'superseded'
  old_price DECIMAL(10,2),
  recommended_price DECIMAL(10,2),
  new_price DECIMAL(10,2), -- actual price after action (for accepts)
  reasoning TEXT,
  urgency VARCHAR(20),
  confidence INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for recommendation history
CREATE INDEX IF NOT EXISTS idx_rec_history_user_id ON recommendation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_rec_history_product_id ON recommendation_history(product_id);
CREATE INDEX IF NOT EXISTS idx_rec_history_action ON recommendation_history(action);
CREATE INDEX IF NOT EXISTS idx_rec_history_created_at ON recommendation_history(created_at);

COMMENT ON TABLE recommendation_history IS 'Complete history of all recommendations and their outcomes';

-- Add status column to recommendations table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recommendations' AND column_name = 'status'
  ) THEN
    ALTER TABLE recommendations ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
  END IF;
END $$;

-- Add acted_at column to recommendations table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recommendations' AND column_name = 'acted_at'
  ) THEN
    ALTER TABLE recommendations ADD COLUMN acted_at TIMESTAMP;
  END IF;
END $$;

-- Create analytics summary view (for admin dashboard)
CREATE OR REPLACE VIEW analytics_summary AS
SELECT
  u.id as user_id,
  u.email,
  u.approved,
  u.created_at as user_created_at,
  s.shop_domain,
  s.is_active as shop_active,
  (SELECT COUNT(*) FROM products WHERE user_id = u.id) as total_products,
  (SELECT COUNT(*) FROM products WHERE user_id = u.id AND cost_price > 0) as products_with_cost,
  (SELECT COUNT(*) FROM recommendations WHERE user_id = u.id AND status = 'pending') as pending_recommendations,
  (SELECT COUNT(*) FROM recommendation_history WHERE user_id = u.id AND action = 'accepted') as accepted_recommendations,
  (SELECT COUNT(*) FROM recommendation_history WHERE user_id = u.id AND action = 'rejected') as rejected_recommendations,
  (SELECT COUNT(*) FROM manual_analyses WHERE user_id = u.id AND triggered_at >= NOW() - INTERVAL '24 hours') as analyses_today,
  (SELECT MAX(created_at) FROM user_activity_log WHERE user_id = u.id) as last_activity
FROM users u
LEFT JOIN shops s ON s.user_id = u.id
WHERE u.approved = true;

COMMENT ON VIEW analytics_summary IS 'Summary view of user analytics for admin dashboard';

-- Grant permissions (adjust based on your RLS setup)
-- ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recommendation_history ENABLE ROW LEVEL SECURITY;
