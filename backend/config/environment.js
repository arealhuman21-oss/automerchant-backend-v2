require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,

  // Auth
  JWT_SECRET: process.env.JWT_SECRET,
  AUTH_MODE: process.env.AUTH_MODE || 'oauth',

  // Shopify (if AUTH_MODE=manual)
  SHOP: process.env.SHOP,
  SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN,

  // Algorithm
  USE_ALGORITHM_V3: process.env.USE_ALGORITHM_V3 === 'true',
  USE_ALGORITHM_V2: process.env.USE_ALGORITHM_V2 === 'true',

  // Admin
  ADMIN_SECRET: process.env.ADMIN_SECRET
};
