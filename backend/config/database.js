const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// CRITICAL: Verify environment variables
console.log('🔧 Database config loading...');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ SET' : '❌ MISSING');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ SET' : '❌ MISSING');
console.log('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ SET' : '❌ MISSING');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ CRITICAL: Missing Supabase environment variables!');
}

/**
 * SECURITY UPDATE: Using ANON_KEY to enforce Row Level Security
 *
 * CRITICAL CHANGE:
 * - OLD: Used SUPABASE_SERVICE_KEY (bypasses RLS - security risk!)
 * - NEW: Using SUPABASE_ANON_KEY (enforces RLS policies)
 *
 * This ensures users can only access their own data at the database level.
 *
 * For operations that need admin access (cron, migrations), use supabaseService instead.
 */

// Main client: Uses ANON_KEY (enforces RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

// Service client: Uses SERVICE_KEY (bypasses RLS)
// ONLY USE FOR: OAuth flows, cron jobs, admin operations
const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

/**
 * Create an authenticated Supabase client for a specific user
 *
 * This function creates a client with the user's JWT token, allowing
 * RLS policies to identify the user via auth.user_id()
 *
 * @param {string} authHeader - The Authorization header (e.g., "Bearer token...")
 * @returns {object} Authenticated Supabase client
 *
 * Usage in routes:
 *   const userClient = getAuthenticatedClient(req.headers.authorization);
 *   const { data } = await userClient.from('products').select('*');
 */
function getAuthenticatedClient(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authentication token provided');
  }

  const token = authHeader.replace('Bearer ', '');

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );
}

module.exports = {
  supabase,              // Default: ANON client (enforces RLS)
  supabaseService,       // Admin: SERVICE client (bypasses RLS)
  getAuthenticatedClient // Helper to create user-specific client
};
