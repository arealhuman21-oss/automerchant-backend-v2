// ============================================
// SHOPIFY DUAL-MODE AUTHENTICATION HELPER
// ============================================
// Supports both manual token mode (dev) and OAuth mode (production)
// Author: AutoMerchant Team
// Last Updated: December 10, 2025

// AUTH_MODE can be:
// - "manual": Uses SHOP and SHOPIFY_ACCESS_TOKEN from .env (development)
// - "oauth": Uses tokens from shops table in database (production)
const AUTH_MODE = process.env.AUTH_MODE || 'manual';

/**
 * Get Shopify credentials based on current AUTH_MODE
 *
 * @param {Object} req - Express request object
 * @param {Object} supabase - Supabase client
 * @returns {Promise<Object>} { shop, accessToken } or throws error
 *
 * MANUAL MODE:
 *   - Returns shop/token from environment variables
 *   - Requires SHOP and SHOPIFY_ACCESS_TOKEN in .env
 *   - Perfect for local development with a test store
 *
 * OAUTH MODE:
 *   - Looks up shop from req.query.shop or req.body.shop
 *   - Fetches access_token from shops table
 *   - Used in production when merchants install via OAuth
 */
async function getShopifyCredentials(req, supabase) {
  if (AUTH_MODE === 'manual') {
    // ========== MANUAL MODE (Development) ==========
    const shop = process.env.SHOP;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!shop || !accessToken) {
      throw new Error(
        'MANUAL MODE ERROR: SHOP and SHOPIFY_ACCESS_TOKEN must be set in .env file.\n' +
        'Example:\n' +
        '  SHOP=myteststore.myshopify.com\n' +
        '  SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx'
      );
    }

    console.log(`🔑 [MANUAL MODE] Using shop: ${shop}`);
    return { shop, accessToken };

  } else if (AUTH_MODE === 'oauth') {
    // ========== OAUTH MODE (Production) ==========

    // Try to get shop from query params or request body
    const shop = req.query.shop || req.body.shop;

    if (!shop) {
      // Fallback: Try to get from authenticated user's connected shop
      if (req.user && req.user.id) {
        const { data: shopData, error } = await supabase
          .from('shops')
          .select('shop_domain, access_token')
          .eq('user_id', req.user.id)
          .eq('is_active', true)
          .order('installed_at', { ascending: false })
          .limit(1)
          .single();

        if (!error && shopData) {
          console.log(`🔑 [OAUTH MODE] Using shop from user ${req.user.id}: ${shopData.shop_domain}`);

          return {
            shop: shopData.shop_domain,
            accessToken: shopData.access_token
          };
        }
      }

      throw new Error(
        'OAUTH MODE ERROR: No shop specified. Provide shop in query params (?shop=...) or request body.'
      );
    }

    // Fetch access token from shops table
    const { data: shopData, error } = await supabase
      .from('shops')
      .select('access_token')
      .eq('shop_domain', shop)
      .eq('is_active', true)
      .single();

    if (error || !shopData) {
      throw new Error(
        `OAuth token not found for shop: ${shop}. ` +
        `Shop may not be installed or token may be inactive.`
      );
    }

    console.log(`🔑 [OAUTH MODE] Using OAuth token for shop: ${shop}`);
    return {
      shop,
      accessToken: shopData.access_token
    };

  } else {
    throw new Error(
      `Invalid AUTH_MODE: "${AUTH_MODE}". Must be "manual" or "oauth".`
    );
  }
}

/**
 * Middleware to attach Shopify credentials to request object
 * Usage: app.get('/api/products', shopifyAuth, async (req, res) => { ... })
 */
function shopifyAuthMiddleware(supabase) {
  return async (req, res, next) => {
    try {
      const credentials = await getShopifyCredentials(req, supabase);
      req.shopify = credentials;
      next();
    } catch (error) {
      console.error('❌ Shopify auth error:', error.message);
      return res.status(401).json({
        error: 'Shopify authentication failed',
        message: error.message,
        mode: AUTH_MODE
      });
    }
  };
}

// Export the helper function and middleware
module.exports = {
  getShopifyCredentials,
  shopifyAuthMiddleware,
  AUTH_MODE
};
