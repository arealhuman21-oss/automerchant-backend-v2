-- Migration 011: Fix all schema issues
-- Date: 2025-12-30
-- Description: Add missing columns and fix schema issues

-- Add rejected_at to recommendations if it doesn't exist
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;

-- Add applied_at to recommendations if it doesn't exist
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP;

-- Add shopify_response to recommendations if it doesn't exist
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS shopify_response JSONB;

-- Verify all columns exist
COMMENT ON COLUMN recommendations.rejected_at IS 'Timestamp when recommendation was rejected by user';
COMMENT ON COLUMN recommendations.applied_at IS 'Timestamp when recommendation was applied to Shopify';
COMMENT ON COLUMN recommendations.shopify_response IS 'Response from Shopify API when price was updated';
