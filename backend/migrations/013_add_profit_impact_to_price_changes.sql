-- Add profit_impact and recommendation_id to price_changes table
-- This allows us to track actual profit made from AI recommendations

ALTER TABLE price_changes
ADD COLUMN IF NOT EXISTS recommendation_id INTEGER REFERENCES recommendations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS profit_impact DECIMAL(10, 2) DEFAULT 0;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_price_changes_recommendation ON price_changes(recommendation_id);

-- Comment
COMMENT ON COLUMN price_changes.profit_impact IS 'Estimated monthly profit impact from this price change (price_diff * monthly_sales)';
COMMENT ON COLUMN price_changes.recommendation_id IS 'References the AI recommendation that led to this price change';
