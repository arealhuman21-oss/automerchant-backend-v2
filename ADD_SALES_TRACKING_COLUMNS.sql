-- ============================================
-- ADD SALES TRACKING COLUMNS TO PRODUCTS TABLE
-- ============================================
-- This adds the missing sales tracking columns needed for
-- profit increase calculations and AI recommendations
--
-- Run this in Supabase SQL Editor
-- ============================================

-- Add total_sales_30d column (total units sold in last 30 days)
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_sales_30d INTEGER DEFAULT 0;

-- Add revenue_30d column (total revenue from this product in last 30 days)
ALTER TABLE products ADD COLUMN IF NOT EXISTS revenue_30d DECIMAL(10, 2) DEFAULT 0.00;

-- Add sales_velocity column (average units sold per day)
ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_velocity DECIMAL(10, 3) DEFAULT 0.000;

-- Add updated_at column if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index for performance on sales queries
CREATE INDEX IF NOT EXISTS idx_products_total_sales_30d ON products(total_sales_30d DESC);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at DESC);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN ('total_sales_30d', 'revenue_30d', 'sales_velocity', 'updated_at')
ORDER BY ordinal_position;

-- Show current products count
SELECT COUNT(*) as total_products FROM products;
