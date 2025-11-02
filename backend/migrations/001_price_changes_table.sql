-- Price Changes Table Migration
-- Tracks all price changes made by the AI for analytics

CREATE TABLE IF NOT EXISTS price_changes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL,
  old_price DECIMAL(10, 2) NOT NULL,
  new_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'applied',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Add comment
COMMENT ON TABLE price_changes IS 'Tracks all AI-powered price changes for analytics and profit calculation';
