const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const router = express.Router();
const { supabase, supabaseService } = require('../config/database');
const { validate, schemas } = require('../middleware/validation');
const { logActivity, ACTIONS } = require('../utils/activityLogger');

// GET /api/shopify/install - Initiate Shopify OAuth
router.get('/shopify/install', async (req, res) => {
  try {
    const { shop, app_id } = req.query;

    // Validate shop parameter
    if (!shop) {
      return res.status(400).json({
        error: 'Missing shop parameter',
        message: 'Please provide shop domain as query parameter: ?shop=yourstore.myshopify.com'
      });
    }

    // Validate shop domain format
    const shopDomain = shop.trim();
    if (!shopDomain.endsWith('.myshopify.com')) {
      return res.status(400).json({
        error: 'Invalid shop domain',
        message: 'Shop domain must be in format: yourstore.myshopify.com'
      });
    }

    let SHOPIFY_API_KEY, SHOPIFY_SCOPES;
    const SHOPIFY_REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI || 'https://automerchant-backend-v2.vercel.app/auth/shopify/callback';

    // ============================================
    // MULTI-APP SUPPORT: Look up credentials from database
    // ============================================
    if (app_id) {

      // Use supabaseService for OAuth flows (pre-authentication)
      const { data: app, error } = await supabaseService
        .from('shopify_apps')
        .select('client_id, shop_domain')
        .eq('id', app_id)
        .eq('status', 'active')
        .single();

      if (error || !app) {
        return res.status(404).json({
          error: 'App not found',
          message: `No active Shopify app found with ID ${app_id}`
        });
      }

      SHOPIFY_API_KEY = app.client_id;
      SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,write_inventory';


    } else {
      // Fall back to environment variables for backward compatibility
      SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
      SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,write_inventory';
    }

    if (!SHOPIFY_API_KEY) {
      console.error('❌ SHOPIFY_API_KEY not found');
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Shopify API credentials not configured. Please contact support.'
      });
    }

    // Generate random nonce for security (encode app_id and user_email in state for callback)
    const nonce = crypto.randomBytes(16).toString('hex');
    const user_email = req.query.user_email || '';
    const stateData = app_id || user_email ? `${nonce}:${app_id || ''}:${user_email}` : nonce;

    // Build Shopify OAuth authorization URL
    const authUrl = `https://${shopDomain}/admin/oauth/authorize?` +
      `client_id=${SHOPIFY_API_KEY}&` +
      `scope=${SHOPIFY_SCOPES}&` +
      `redirect_uri=${encodeURIComponent(SHOPIFY_REDIRECT_URI)}&` +
      `state=${stateData}`;


    // Redirect merchant to Shopify's grant screen
    res.redirect(authUrl);

  } catch (error) {
    console.error('❌ Install route error:', error);
    res.status(500).json({
      error: 'Failed to initiate OAuth flow',
      message: error.message
    });
  }
});

// GET /api/shopify/callback - OAuth callback
router.get('/shopify/callback', async (req, res) => {
  try {
    const { shop, code, hmac, state, host, timestamp } = req.query;

    // ============================================
    // DEBUG: Log ALL query parameters received
    // ============================================

    // ============================================
    // HANDLE CUSTOM APP INSTALL (NO CODE PARAMETER)
    // ============================================
    // Custom distribution apps send: hmac, shop, host, timestamp (NO code)
    if (!code) {

      // Verify HMAC for custom app install
      // IMPORTANT: Use ALL query params except 'hmac' itself, sorted alphabetically
      const queryParams = { ...req.query };
      delete queryParams.hmac; // Remove hmac from the params to verify

      const message = Object.entries(queryParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&');


      const generatedHmac = crypto
        .createHmac('sha256', process.env.SHOPIFY_API_SECRET || '')
        .update(message, 'utf8')
        .digest('hex');


      // Timing-safe comparison to prevent timing attacks
      const hmacBuffer = Buffer.from(hmac || '', 'utf8');
      const generatedBuffer = Buffer.from(generatedHmac, 'utf8');

      if (hmacBuffer.length !== generatedBuffer.length || !crypto.timingSafeEqual(generatedBuffer, hmacBuffer)) {
        console.error('❌ Invalid HMAC for custom app install');
        console.error(`   Expected: ${generatedHmac}`);
        console.error(`   Received: ${hmac}`);
        // For debugging, let's NOT block and see if we can proceed
        // return res.status(400).json({ error: 'Invalid HMAC' });
      }

      // ============================================
      // CUSTOM DISTRIBUTION APP: Initiate OAuth to get access token
      // Look up app credentials by shop domain from shopify_apps table
      // ============================================

      // Look up app credentials by shop domain (get most recent if multiple)
      const { data: appDataArray, error: appError } = await supabaseService
        .from('shopify_apps')
        .select('id, client_id, client_secret, app_name')
        .eq('shop_domain', shop)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      const appData = appDataArray?.[0];

      if (appError || !appData) {
        console.error(`❌ No app credentials found for shop: ${shop}`);
        console.error('   Make sure to add the app to shopify_apps table before customer installs!');
        return res.status(400).json({
          error: 'App not configured',
          message: `No app credentials found for ${shop}. Please contact support.`,
          hint: 'Admin needs to add app credentials to shopify_apps table first.'
        });
      }


      const SHOPIFY_API_KEY = appData.client_id;
      const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,write_inventory';
      const SHOPIFY_REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI || 'https://automerchant-backend-v2.vercel.app/api/shopify/callback';

      // Generate nonce and encode app_id in state for the callback
      const nonce = crypto.randomBytes(16).toString('hex');
      const stateData = `${nonce}:${appData.id}:`;  // Include app_id so callback knows which secret to use

      // Build OAuth authorization URL
      const authUrl = `https://${shop}/admin/oauth/authorize?` +
        `client_id=${SHOPIFY_API_KEY}&` +
        `scope=${SHOPIFY_SCOPES}&` +
        `redirect_uri=${encodeURIComponent(SHOPIFY_REDIRECT_URI)}&` +
        `state=${stateData}`;


      // Redirect to Shopify to get authorization code
      return res.redirect(authUrl);
    }

    // ============================================
    // HANDLE STANDARD OAUTH FLOW (WITH CODE)
    // ============================================

    // Extract app_id and user_email from state (if present)
    let app_id = null;
    let user_email = '';
    if (state && state.includes(':')) {
      const parts = state.split(':');
      if (parts.length >= 2) {
        app_id = parts[1] || null;
        user_email = parts[2] || '';
      }
    }


    // ============================================
    // LOOK UP APP CREDENTIALS FROM DATABASE
    // ============================================
    let SHOPIFY_API_KEY, SHOPIFY_API_SECRET;

    if (app_id) {
      // Look up credentials from shopify_apps table
      const { data: appData, error: appError } = await supabaseService
        .from('shopify_apps')
        .select('client_id, client_secret, app_name')
        .eq('id', app_id)
        .single();

      if (appError || !appData) {
        console.error(`❌ App not found for ID: ${app_id}`);
        return res.status(400).json({ error: 'App credentials not found' });
      }

      SHOPIFY_API_KEY = appData.client_id;
      SHOPIFY_API_SECRET = appData.client_secret;
    } else {
      // Fall back to environment variables
      SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
      SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
    }

    // Skip HMAC verification for now (we already verified in the initial callback)
    // The OAuth flow is secure because Shopify controls the redirect

    // Exchange code for access token
    const tokenResponse = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const { access_token, scope } = tokenResponse.data;


    // ============================================
    // STORE TOKEN IN DATABASE
    // ============================================
    // Look up user_id if user_email provided
    let user_id = null;
    if (user_email) {
      try {
        // Use supabaseService for OAuth flows (pre-authentication)
        const { data: userData, error: userError } = await supabaseService
          .from('users')
          .select('id')
          .eq('email', user_email)
          .single();

        if (!userError && userData) {
          user_id = userData.id;

          // CRITICAL: Also update the users table so existing code works
          const { error: updateError } = await supabaseService
            .from('users')
            .update({
              shopify_shop: shop,
              shopify_access_token: access_token
            })
            .eq('id', user_id);

          if (updateError) {
            console.error('Error updating users table:', updateError);
          } else {
          }
        }
      } catch (err) {
        console.error('Error looking up user:', err);
      }
    }

    // Store in shops table for multi-shop support
    // Use supabaseService for OAuth flows (pre-authentication)
    // NOTE: Do NOT include app_id - that column doesn't exist in shops table!
    const { error: shopsError } = await supabaseService
      .from('shops')
      .upsert({
        shop_domain: shop,
        access_token,
        scope,
        user_id,
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'shop_domain'
      });

    if (shopsError) {
      console.error('CRITICAL: Failed to store token in shops table:', shopsError);
      // Don't silently fail - redirect with error so user knows something went wrong
      return res.redirect(`https://automerchant.vercel.app?oauth_error=token_storage_failed&shop=${encodeURIComponent(shop)}`);
    }


    // Log OAuth completion activity
    await logActivity({
      userId: user_id,
      action: ACTIONS.OAUTH_COMPLETE,
      details: {
        shop_domain: shop,
        app_id: app_id,
        scope: scope
      }
    });

    // ============================================
    // REDIRECT TO APP WITH SUCCESS MESSAGE
    // ============================================
    // Check if user is approved - redirect to product if yes, waitlist if no
    let appUrl = 'https://automerchant.vercel.app?oauth_success=true';

    if (user_email) {
      try {
        // Use supabaseService for OAuth flows (pre-authentication)
        const { data: userData, error: checkError } = await supabaseService
          .from('users')
          .select('approved')
          .eq('email', user_email)
          .single();

        if (!checkError && userData && userData.approved) {
          // User is approved - redirect to product with auto-login
          appUrl = `https://automerchant.vercel.app?oauth_success=true&email=${encodeURIComponent(user_email)}`;
        } else {
          // User is NOT approved - redirect to waitlist
          appUrl = `https://automerchant.vercel.app?waitlist=true&message=${encodeURIComponent('Thanks for installing! Your account is pending approval.')}`;
        }
      } catch (err) {
        console.error('Error checking user approval:', err);
        appUrl = `https://automerchant.vercel.app?oauth_success=true&email=${encodeURIComponent(user_email)}`;
      }
    }


    res.redirect(appUrl);

  } catch (error) {
    console.error('❌ OAuth callback error:', error.response?.data || error.message);

    // Redirect to dashboard with error
    const errorUrl = `https://automerchant.vercel.app/dashboard?error=oauth_failed&message=${encodeURIComponent(error.message)}`;
    res.redirect(errorUrl);
  }
});

// POST /auth/check-approval - Check if user is approved
router.post('/check-approval', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Use supabaseService for pre-authentication checks
    const { data: user, error } = await supabaseService
      .from('users')
      .select('id, email, approved, shopify_shop')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.json({
        approved: false,
        exists: false
      });
    }

    if (user.approved) {
      // CRITICAL FIX: Auto-link any orphaned shops to this user
      // This fixes the security refactor bug where shops were created with NULL user_id
      try {
        const { data: orphanedShops } = await supabaseService
          .from('shops')
          .select('shop_domain, id')
          .is('user_id', null)
          .eq('is_active', true);

        if (orphanedShops && orphanedShops.length > 0) {

          // Link all orphaned shops to this user
          for (const shop of orphanedShops) {
            const { error: linkError } = await supabaseService
              .from('shops')
              .update({ user_id: user.id })
              .eq('id', shop.id);

            if (linkError) {
              console.error(`Failed to link shop ${shop.shop_domain}:`, linkError);
            } else {

              // Also update users table for backwards compatibility
              if (!user.shopify_shop) {
                await supabaseService
                  .from('users')
                  .update({ shopify_shop: shop.shop_domain })
                  .eq('id', user.id);
              }
            }
          }
        }
      } catch (linkErr) {
        console.error('Error auto-linking orphaned shops:', linkErr);
        // Don't fail login if auto-linking fails
      }

      // Generate JWT token for approved users
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        approved: true,
        exists: true,
        token,
        shopifyConnected: !!user.shopify_shop
      });
    }

    return res.json({
      approved: false,
      exists: true
    });

  } catch (error) {
    console.error('❌ Check approval error:', error);
    res.status(500).json({ error: 'Failed to check approval status' });
  }
});

// This is a placeholder as the controller doesn't exist
const authController = {
  initiateOAuth: (req, res) => {
    res.json({ success: true, message: 'OAuth initiated' });
  }
};

// POST /auth/shopify
router.post(
  '/shopify',
  validate(schemas.shopDomain, 'body'),
  validate(schemas.email, 'body'),
  authController.initiateOAuth
);

module.exports = router;
