const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/**
 * RLS-Enabled Supabase Client
 *
 * This configuration uses ANON_KEY instead of SERVICE_KEY to enforce
 * Row Level Security policies at the database level.
 *
 * CRITICAL SECURITY:
 * - SERVICE_KEY bypasses all RLS policies (admin access)
 * - ANON_KEY enforces RLS policies (user access)
 *
 * We must use ANON_KEY in production to prevent users from accessing
 * each other's data.
 */

// Base client with ANON_KEY (enforces RLS)
const supabaseAnonClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,  // We handle auth with our own JWT
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

/**
 * Create an authenticated Supabase client with user JWT
 *
 * This function creates a Supabase client that includes the user's JWT token,
 * which allows RLS policies to identify the current user via auth.user_id()
 *
 * @param {string} userJWT - The JWT token from req.user (set by authenticateToken middleware)
 * @returns {object} Authenticated Supabase client
 *
 * Usage in routes:
 *   const client = getAuthenticatedClient(req.headers.authorization);
 *   const { data } = await client.from('products').select('*');
 */
function getAuthenticatedClient(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authentication token provided');
  }

  const token = authHeader.replace('Bearer ', '');

  // Create a new client with the user's JWT
  // This token will be used by RLS policies to determine user_id
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

/**
 * Legacy service client (bypasses RLS)
 *
 * ONLY USE THIS FOR:
 * - System operations (cron jobs, migrations)
 * - Admin operations (with ADMIN_SECRET verification)
 * - OAuth flows (before user is authenticated)
 *
 * NEVER use this for regular user operations!
 */
const supabaseServiceClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = {
  // Default export: ANON client (enforces RLS)
  supabase: supabaseAnonClient,

  // Function to get authenticated client for a specific user
  getAuthenticatedClient,

  // Legacy service client (use sparingly!)
  supabaseService: supabaseServiceClient,

  // Alias for clarity
  supabaseAnon: supabaseAnonClient
};
