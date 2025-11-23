-- Migration: Create shops table for OAuth-based Shopify installations
-- This table stores access tokens for merchants who install via OAuth
-- Run this migration when switching to production OAuth mode

CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) UNIQUE NOT NULL,  -- e.g., "myteststore.myshopify.com"
  access_token TEXT NOT NULL,                -- OAuth access token from Shopify
  scope TEXT,                                 -- Permission scopes granted
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- Optional link to users table
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Index for fast shop lookups
CREATE INDEX IF NOT EXISTS idx_shops_domain ON shops(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shops_user_id ON shops(user_id);

-- Comments for documentation
COMMENT ON TABLE shops IS 'Stores OAuth access tokens for Shopify shops that installed the app';
COMMENT ON COLUMN shops.shop_domain IS 'Shopify shop domain (e.g., myteststore.myshopify.com)';
COMMENT ON COLUMN shops.access_token IS 'OAuth access token for Shopify Admin API calls';
