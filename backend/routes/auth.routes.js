const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const router = express.Router();
const { supabase } = require('../config/database');

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
    const SHOPIFY_REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI || 'https://automerchant-backend-v2.vercel.app/api/shopify/callback';

    // ============================================
    // MULTI-APP SUPPORT: Look up credentials from database
    // ============================================
    if (app_id) {
      console.log(`🔐 [OAuth Install] Using app_id ${app_id} from database`);

      const { data: app, error } = await supabase
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

      console.log(`   Using app for shop: ${app.shop_domain}`);

    } else {
      // Fall back to environment variables for backward compatibility
      console.log(`🔐 [OAuth Install] Using credentials from environment variables`);
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

    console.log(`🔐 [OAuth Install] Redirecting shop ${shopDomain} to Shopify authorization`);
    console.log(`   Scopes: ${SHOPIFY_SCOPES}`);
    console.log(`   Redirect URI: ${SHOPIFY_REDIRECT_URI}`);

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
    // HANDLE CUSTOM APP INSTALL (NO CODE PARAMETER)
    // ============================================
    // Custom distribution apps send: hmac, shop, host, timestamp (NO code)
    if (!code) {
      console.log('🔐 [Custom App Install] Processing custom app installation');
      console.log(`   Shop: ${shop}`);
      console.log(`   Host: ${host}`);
      console.log(`   Timestamp: ${timestamp}`);

      // Verify HMAC for custom app install
      const map = { shop, host, timestamp };
      const message = Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

      const generatedHmac = crypto
        .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
        .update(message, 'utf8')
        .digest('hex');

      if (generatedHmac !== hmac) {
        console.error('❌ Invalid HMAC for custom app install');
        return res.status(400).json({ error: 'Invalid HMAC' });
      }

      // For custom app installs, redirect to App URL root with success message
      const appUrl = `https://automerchant.vercel.app?custom_app_install=success&shop=${encodeURIComponent(shop)}`;
      console.log(`🎉 Custom app install complete! Redirecting to: ${appUrl}`);
      return res.redirect(appUrl);
    }

    // ============================================
    // HANDLE STANDARD OAUTH FLOW (WITH CODE)
    // ============================================
    console.log('🔐 [Standard OAuth] Processing standard OAuth callback');
    console.log(`   Shop: ${shop}`);
    console.log(`   Code: ${code.substring(0, 6)}...`);

    // Verify HMAC for security
    const map = { shop, code, state, timestamp };
    const message = Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    const generatedHmac = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
      .update(message, 'utf8')
      .digest('hex');

    if (generatedHmac !== hmac) {
      console.error('❌ Invalid HMAC');
      return res.status(400).json({ error: 'Invalid HMAC' });
    }

    // Extract app_id and user_email from state (if present)
    let app_id = null;
    let user_email = '';
    if (state.includes(':')) {
      const parts = state.split(':');
      if (parts.length >= 2) {
        app_id = parts[1] || null;
        user_email = parts[2] || '';
      }
    }

    console.log(`   App ID: ${app_id || 'none'}`);
    console.log(`   User Email: ${user_email || 'none'}`);

    // Exchange code for access token
    const tokenResponse = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
        redirect_uri: process.env.SHOPIFY_REDIRECT_URI || 'https://automerchant-backend-v2.vercel.app/api/shopify/callback'
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const { access_token, scope } = tokenResponse.data;

    console.log('✅ Access token received from Shopify');
    console.log(`   Scope: ${scope}`);

    // ============================================
    // STORE TOKEN IN DATABASE
    // ============================================
    // Look up user_id if user_email provided
    let user_id = null;
    if (user_email) {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user_email)
          .single();

        if (!userError && userData) {
          user_id = userData.id;
          console.log(`✅ Linked shop to user: ${user_email} (ID: ${user_id})`);

          // CRITICAL: Also update the users table so existing code works
          const { error: updateError } = await supabase
            .from('users')
            .update({
              shopify_shop: shop,
              shopify_access_token: access_token
            })
            .eq('id', user_id);

          if (updateError) {
            console.error('Error updating users table:', updateError);
          } else {
            console.log(`✅ Updated users table for user ID ${user_id}`);
          }
        }
      } catch (err) {
        console.error('Error looking up user:', err);
      }
    }

    // Store in shops table for multi-shop support
    const { error: shopsError } = await supabase
      .from('shops')
      .upsert({
        shop_domain: shop,
        access_token,
        scope,
        user_id,
        app_id,
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'shop_domain'
      });

    if (shopsError) {
      console.error('Error storing in shops table:', shopsError);
    }

    console.log(`✅ Token stored in shops table for shop: ${shop} with app_id: ${app_id}`);

    // ============================================
    // REDIRECT TO APP WITH SUCCESS MESSAGE
    // ============================================
    // Check if user is approved - redirect to product if yes, waitlist if no
    let appUrl = 'https://automerchant.vercel.app?oauth_success=true';

    if (user_email) {
      try {
        const { data: userData, error: checkError } = await supabase
          .from('users')
          .select('approved')
          .eq('email', user_email)
          .single();

        if (!checkError && userData && userData.approved) {
          // User is approved - redirect to product with auto-login
          appUrl = `https://automerchant.vercel.app?oauth_success=true&email=${encodeURIComponent(user_email)}`;
          console.log(`✅ Approved user ${user_email} - redirecting to product dashboard`);
        } else {
          // User is NOT approved - redirect to waitlist
          appUrl = `https://automerchant.vercel.app?waitlist=true&message=${encodeURIComponent('Thanks for installing! Your account is pending approval.')}`;
          console.log(`⏳ Pending user ${user_email} - redirecting to waitlist`);
        }
      } catch (err) {
        console.error('Error checking user approval:', err);
        appUrl = `https://automerchant.vercel.app?oauth_success=true&email=${encodeURIComponent(user_email)}`;
      }
    }

    console.log(`🎉 OAuth installation complete! Redirecting to: ${appUrl}`);

    res.redirect(appUrl);

  } catch (error) {
    console.error('❌ OAuth callback error:', error.response?.data || error.message);

    // Redirect to dashboard with error
    const errorUrl = `https://automerchant.vercel.app/dashboard?error=oauth_failed&message=${encodeURIComponent(error.message)}`;
    res.redirect(errorUrl);
  }
});

module.exports = router;
