-- Add product selection fields
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_selected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS selected_at TIMESTAMP;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_selected ON products(user_id, is_selected);

-- Add user settings for selection state
ALTER TABLE users
ADD COLUMN IF NOT EXISTS has_completed_product_selection BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS product_selection_completed_at TIMESTAMP;
