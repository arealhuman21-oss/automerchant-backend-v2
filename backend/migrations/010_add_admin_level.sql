-- Migration 010: Add admin_level column to users table
-- This enables admin authentication for the admin panel

-- Step 1: Add admin_level column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS admin_level VARCHAR(20) DEFAULT NULL;

-- Step 2: Add index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_users_admin_level ON users(admin_level);

-- Step 3: Set arealhuman21@gmail.com as admin
UPDATE users
SET admin_level = 'admin'
WHERE email = 'arealhuman21@gmail.com';

-- Step 4: Add comment
COMMENT ON COLUMN users.admin_level IS 'Admin access level: NULL (regular user), admin (full admin access)';
