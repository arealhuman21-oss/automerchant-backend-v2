-- Migration: Create shopify_apps table for managing multiple Shopify app credentials
-- This allows one backend to handle multiple Shopify Partner apps for scaling

CREATE TABLE IF NOT EXISTS shopify_apps (
  id SERIAL PRIMARY KEY,
  app_name VARCHAR(255) NOT NULL UNIQUE,  -- e.g., "App 1", "App 2"
  client_id VARCHAR(255) NOT NULL,        -- Shopify API Key
  client_secret VARCHAR(255) NOT NULL,    -- Shopify API Secret
  shop_domain VARCHAR(255),               -- Which shop this app is for
  status VARCHAR(50) DEFAULT 'active',    -- active, inactive
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add approved column to users table for waitlist management
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

-- Approve the admin email automatically
UPDATE users SET approved = true WHERE email = 'arealhuman21@gmail.com';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shopify_apps_name ON shopify_apps(app_name);
CREATE INDEX IF NOT EXISTS idx_shopify_apps_shop ON shopify_apps(shop_domain);
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Comments
COMMENT ON TABLE shopify_apps IS 'Stores multiple Shopify Partner app credentials for scaling beyond custom distribution limits';
COMMENT ON COLUMN shopify_apps.app_name IS 'Friendly name for the app (e.g., "App 1", "Customer ABC App")';
COMMENT ON COLUMN shopify_apps.client_id IS 'Shopify Partner App API Key (Client ID)';
COMMENT ON COLUMN shopify_apps.client_secret IS 'Shopify Partner App API Secret';
COMMENT ON COLUMN shopify_apps.shop_domain IS 'Which Shopify store this app is configured for';
