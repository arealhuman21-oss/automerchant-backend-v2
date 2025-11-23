// ============================================
// SHOPIFY DUAL-MODE AUTHENTICATION HELPER
// ============================================
// Supports both manual token mode (dev) and OAuth mode (production)
// Author: AutoMerchant Team
// Last Updated: 2025

const { Pool } = require('pg');

// AUTH_MODE can be:
// - "manual": Uses SHOP and SHOPIFY_ACCESS_TOKEN from .env (development)
// - "oauth": Uses tokens from shops table in database (production)
const AUTH_MODE = process.env.AUTH_MODE || 'manual';

/**
 * Get Shopify credentials based on current AUTH_MODE
 *
 * @param {Object} req - Express request object
 * @param {Object} pool - PostgreSQL connection pool
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
async function getShopifyCredentials(req, pool) {
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
      // Fallback: Try to get from authenticated user's record
      if (req.user && req.user.id) {
        const userResult = await pool.query(
          'SELECT shopify_shop FROM users WHERE id = $1',
          [req.user.id]
        );

        if (userResult.rows.length > 0 && userResult.rows[0].shopify_shop) {
          const userShop = userResult.rows[0].shopify_shop;
          console.log(`🔑 [OAUTH MODE] Using shop from user profile: ${userShop}`);

          // Fetch token from shops table
          const shopResult = await pool.query(
            'SELECT access_token FROM shops WHERE shop_domain = $1 AND is_active = true',
            [userShop]
          );

          if (shopResult.rows.length === 0) {
            throw new Error(`No active OAuth token found for shop: ${userShop}`);
          }

          return {
            shop: userShop,
            accessToken: shopResult.rows[0].access_token
          };
        }
      }

      throw new Error(
        'OAUTH MODE ERROR: No shop specified. Provide shop in query params (?shop=...) or request body.'
      );
    }

    // Fetch access token from shops table
    const result = await pool.query(
      'SELECT access_token FROM shops WHERE shop_domain = $1 AND is_active = true',
      [shop]
    );

    if (result.rows.length === 0) {
      throw new Error(
        `OAuth token not found for shop: ${shop}. ` +
        `Shop may not be installed or token may be inactive.`
      );
    }

    console.log(`🔑 [OAUTH MODE] Using OAuth token for shop: ${shop}`);
    return {
      shop,
      accessToken: result.rows[0].access_token
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
function shopifyAuthMiddleware(pool) {
  return async (req, res, next) => {
    try {
      const credentials = await getShopifyCredentials(req, pool);
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
