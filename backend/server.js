require('dotenv').config();

// ============================================
// ENVIRONMENT VARIABLE VALIDATION
// ============================================
const requiredEnv = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(v => !process.env[v]);

if (missingEnv.length > 0) {
  console.error('❌ CRITICAL: Missing required environment variables!');
  console.error(`   The following variables are missing in your .env file:`);
  console.error(`   ${missingEnv.join(', ')}`);
  console.error('   Please create a backend/.env file and add them.');
  console.error('   You can use backend/.env.example as a template.');
  process.exit(1); // Exit with a failure code
}

// ============================================
// COMPLETE BACKEND - server.js
// REFACTORED VERSION - Using Supabase JS Client Only
// ============================================

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const { supabase, supabaseService } = require('./config/database');
const config = require('./config/environment');
const { AUTH_MODE, PORT, USE_ALGORITHM_V3, JWT_SECRET, ADMIN_SECRET } = config;
const corsMiddleware = require('./middleware/cors');
const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');


// Import routes
const authRoutes = require('./routes/auth.routes');
const productsRoutes = require('./routes/products.routes');
const analysisRoutes = require('./routes/analysis.routes');
const recommendationsRoutes = require('./routes/recommendations.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const debugRoutes = require('./routes/debug.routes');

// Import analysis service (for cron job)
const analysisService = require('./services/analysis.service');
const { handleAutoAnalysisCron } = require('./services/analysis.service');

const app = express();

// SECURITY FIX: Enable rate limiting to prevent brute force and abuse
const rateLimit = require('express-rate-limit');

// Auth endpoints: 5 login attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    error: 'Too many login attempts from this IP. Please try again in 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

// Analysis endpoint: Enforced by database (10 per 24 hours per user)
// This is a backup in case the database check fails
const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour per user (backup protection)
  message: {
    error: 'Too many analysis requests. Please wait before trying again.'
  },
  keyGenerator: (req) => {
    // Rate limit by user ID (analysis endpoint requires auth, so user is always present)
    return req.user?.id?.toString() || 'anonymous';
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  }
});

// Admin endpoints: 100 requests per hour (prevent brute force)
const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  message: {
    error: 'Too many admin requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Shopify API rate limiter using bottleneck (2 req/sec = Shopify REST API limit)
const Bottleneck = require('bottleneck');
const shopifyLimiter = new Bottleneck({
  minTime: 500, // 500ms between requests = 2 req/sec
  maxConcurrent: 1
});

// Wrapper for Shopify API calls
const shopifyAPI = {
  get: (url, config) => shopifyLimiter.schedule(() => axios.get(url, config)),
  post: (url, data, config) => shopifyLimiter.schedule(() => axios.post(url, data, config)),
  put: (url, data, config) => shopifyLimiter.schedule(() => axios.put(url, data, config))
};



// ============================================
// SHOPIFY AUTH MODE STARTUP LOGGING
// ============================================

if (AUTH_MODE === 'manual') {

  if (!process.env.SHOP || !process.env.SHOPIFY_ACCESS_TOKEN) {
  }
} else if (AUTH_MODE === 'oauth') {
} else {
}


// ============================================
// HELPER FUNCTIONS
// ============================================

// Helper function to calculate next cron schedule time (aligns with :00 and :30 marks)
// Used for syncing auto-analysis timer with actual cron-job.org schedule
function getNextCronTime() {
  const now = new Date();
  const minutes = now.getMinutes();
  const nextCronMinute = minutes < 30 ? 30 : 60;
  const minutesToAdd = nextCronMinute - minutes;

  const nextCron = new Date(now.getTime() + minutesToAdd * 60 * 1000);
  nextCron.setSeconds(0);
  nextCron.setMilliseconds(0);

  return nextCron;
}

// Middleware
app.use(express.json());
app.use(corsMiddleware);

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "https://mfuqxntaivvqiajfgjtv.supabase.co",
        "https://*.shopify.com"
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny' // Prevent clickjacking
  },
  noSniff: true, // Prevent MIME sniffing
  xssFilter: true // Enable XSS filter
}));

// Health check (keep this simple route in server.js)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Cron endpoint for auto-analysis (called by cron-job.org every 30 minutes)
app.get('/api/cron/auto-analysis', async (req, res) => {

  // Verify CRON_SECRET from Authorization header
  const authHeader = req.headers.authorization || '';
  const providedSecret = authHeader.replace('Bearer ', '').trim();
  const expectedSecret = (process.env.CRON_SECRET || '').trim();

  if (!expectedSecret) {
    console.error('❌ [CRON] CRON_SECRET not configured in environment');
    return res.status(500).json({ error: 'CRON_SECRET not configured' });
  }

  if (providedSecret !== expectedSecret) {
    console.error('❌ [CRON] Invalid CRON_SECRET provided');
    return res.status(401).json({ error: 'Unauthorized - invalid CRON_SECRET' });
  }

  try {
    const result = await handleAutoAnalysisCron();
    res.json({
      success: true,
      message: 'Auto-analysis completed',
      ...result
    });
  } catch (error) {
    console.error('❌ [CRON] Auto-analysis error:', error);
    res.status(500).json({
      error: 'Auto-analysis failed',
      message: error.message
    });
  }
});

app.use(cookieParser());







// Mount routes
app.use('/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', userRoutes);
app.use('/api/debug', debugRoutes);

// CRITICAL FIX: Mount auth routes at /api as well to support Shopify redirect URL
// Shopify app is configured to redirect to /api/shopify/callback
app.use('/api', authRoutes);

// ============================================
// HANDLE SHOPIFY CALLBACK AT ROOT URL
// Some Shopify apps redirect to App URL (/) instead of callback URL
// This catches those and processes them properly
// ============================================
app.get('/', async (req, res) => {
  const { shop, hmac, host, timestamp, code } = req.query;

  // If this looks like a Shopify callback (has shop + hmac), forward to callback handler
  if (shop && hmac) {

    // Forward to the callback route by building the URL
    const callbackUrl = `/api/shopify/callback?${new URLSearchParams(req.query).toString()}`;
    return res.redirect(callbackUrl);
  }

  // Normal root request - return health check or redirect to frontend
  res.json({
    status: 'ok',
    service: 'AutoMerchant Backend',
    version: '2.0',
    timestamp: new Date().toISOString()
  });
});













// Error handler (must be last)
app.use(errorHandler);










// ============ HELPER FUNCTION FOR ANALYSIS ============
// NOTE: This function is DEPRECATED - use analysisService.runAnalysisForUser() instead!
// The function below had a bug that wiped out cost_price during sync.
// Keeping it commented out for reference.

/* DEPRECATED - DO NOT USE
async function runAnalysisForUser(userId) {

  // ============================================
  // DUAL-MODE AUTH: Get credentials based on AUTH_MODE
  // For background jobs, we create a mock req with user ID
  // ============================================
  let shop, accessToken;

  if (config.AUTH_MODE === 'manual') {
    // Manual mode: use env variables
    shop = config.SHOP;
    accessToken = config.SHOPIFY_ACCESS_TOKEN;

    if (!shop || !accessToken) {
      return;
    }
  } else {
    // OAuth mode: fetch from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('shopify_shop')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.shopify_shop) {
      return;
    }

    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('access_token')
      .eq('shop_domain', user.shopify_shop)
      .eq('is_active', true)
      .single();

    if (shopError || !shopData) {
      return;
    }

    shop = user.shopify_shop;
    accessToken = shopData.access_token;
  }

  // ============================================
  // CRITICAL FIX: SYNC PRODUCTS BEFORE ANALYSIS
  // This ensures we have FRESH data, not stale data
  // ============================================

  try {
    // Fetch products from Shopify
    const productsResponse = await axios.get(
      `https://${shop}/admin/api/2024-01/products.json?limit=250`,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );

    // Fetch orders from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const orders = await fetchAllOrdersPaginated(shop, accessToken, thirtyDaysAgo);

    // Calculate sales per variant
    const variantSales = {};
    const variantRevenue = {};
    orders.forEach(order => {
      order.line_items?.forEach(item => {
        const variantId = item.variant_id?.toString();
        if (variantId) {
          variantSales[variantId] = (variantSales[variantId] || 0) + (item.quantity || 0);
          variantRevenue[variantId] = (variantRevenue[variantId] || 0) + (parseFloat(item.price) * (item.quantity || 0));
        }
      });
    });

    // Get shop data for app_id (using shop domain, not user_id)
    const { data: shopDataForSync } = await supabase
      .from('shops')
      .select('shop_domain, app_id')
      .eq('shop_domain', shop)
      .eq('is_active', true)
      .single();

    const shopDomain = shopDataForSync?.shop_domain || shop;
    const appId = shopDataForSync?.app_id || null;

    // Update products table with fresh data
    for (const product of productsResponse.data.products) {
      const variant = product.variants[0];
      const variantId = variant.id.toString();
      const totalSales = variantSales[variantId] || 0;
      const totalRevenue = variantRevenue[variantId] || 0;
      const salesVelocity = totalSales / 30;

      const productData = {
        user_id: userId,
        shop_domain: shopDomain,
        app_id: appId,
        shopify_product_id: product.id.toString(),
        shopify_variant_id: variantId,
        title: product.title,
        price: variant.price,
        inventory: variant.inventory_quantity || 0,
        image_url: product.image?.src || null,
        total_sales_30d: totalSales,
        revenue_30d: totalRevenue,
        sales_velocity: salesVelocity,
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('products')
        .upsert(productData, {
          onConflict: 'user_id,shopify_variant_id'
        });
    }

  } catch (syncError) {
    console.error(`⚠️ Product sync failed for user ${userId}, continuing with database data:`, syncError.message);
    // Continue anyway - better to analyze with slightly stale data than skip analysis
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .eq('selected_for_analysis', true);

  if (productsError || !products || products.length === 0) {
    return;
  }


  const allProducts = products;
  const userSettings = { target_margin: 0.40 };  // CRITICAL FIX: Must be decimal (0.40 = 40%), not integer

  // Get price decrease history (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: decreaseHistory, error: historyError } = await supabase
    .from('price_changes')
    .select('product_id, old_price, new_price')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const priceDecreaseHistory = {};
  if (!historyError && decreaseHistory) {
    // Filter for actual price decreases in JavaScript
    decreaseHistory.forEach(row => {
      if (row.new_price < row.old_price) {
        priceDecreaseHistory[row.product_id] = (priceDecreaseHistory[row.product_id] || 0) + 1;
      }
    });
  }


  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let recentOrderData = {};
  try {
    const ordersResponse = await axios.get(
      `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${sevenDaysAgo.toISOString()}&limit=250`,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );

    const orders = ordersResponse.data.orders || [];
    const variantSales7d = {};

    orders.forEach(order => {
      order.line_items?.forEach(item => {
        const variantId = item.variant_id?.toString();
        if (variantId) {
          variantSales7d[variantId] = (variantSales7d[variantId] || 0) + (item.quantity || 0);
        }
      });
    });

    allProducts.forEach(product => {
      const key = `sales7d_${product.id}`;
      recentOrderData[key] = variantSales7d[product.shopify_variant_id] || 0;
    });
  } catch (error) {
    console.error('Failed to fetch recent orders:', error);
  }

  // ============================================
  // V3: LOAD PERSISTENCE STATE
  // ============================================
  let regretBudgets = {};
  let elasticityLearners = {};
  let priceHistory = {};

  if (USE_ALGORITHM_V3) {
    try {
      regretBudgets = await loadRegretBudgets(supabase, userId);
      elasticityLearners = await loadElasticityLearners(supabase, userId);

      // Load price change observations for elasticity learning
      for (const product of allProducts) {
        const observations = await loadPriceChangeObservations(supabase, userId, product.id, 10);
        if (observations.length > 0) {
          priceHistory[product.id] = observations;
        }
      }

    } catch (error) {
      console.error('⚠️ V3 state loading failed (tables may not exist yet):', error.message);
      throw new Error('V3 tables not found - run migrations first');
    }
  }

  let recommendationsCreated = 0;

  for (const product of allProducts) {
    try {
      //   cost_price: product.cost_price,
      //   price: product.price,
      //   inventory: product.inventory,
      //   sales_velocity: product.sales_velocity
      // });

      // Algorithm: V3 only (V2 removed)
      const analysis = await analyzeProductV3(
        product,
        allProducts,
        userSettings,
        recentOrderData,
        priceHistory,
        regretBudgets,
        elasticityLearners
      );

      //   shouldChangePrice: analysis.shouldChangePrice,
      //   recommendedPrice: analysis.recommendedPrice,
      //   urgency: analysis.urgency,
      //   confidence: analysis.confidence,
      //   algorithm: 'V3',
      //   error: analysis.error || 'none'
      // });

      if (analysis.shouldChangePrice) {
        // UPSERT to prevent duplicate recommendations (atomic operation)
        const { data: newRec, error: upsertError } = await supabase
          .from('recommendations')
          .upsert({
            user_id: userId,
            product_id: product.id,
            recommended_price: analysis.recommendedPrice,
            reasoning: analysis.reasoning,
            urgency: analysis.urgency || 'MEDIUM',
            confidence: analysis.confidence,
            created_at: new Date().toISOString()  // Force timestamp update
          }, {
            onConflict: 'user_id,product_id',  // Uses unique constraint from migration
            ignoreDuplicates: false  // Always overwrite existing recommendation
          })
          .select()
          .single();

        if (upsertError) {
          console.error('Error upserting recommendation:', upsertError);
        } else {
          recommendationsCreated++;

          // Save V3 metadata if using V3
          if (USE_ALGORITHM_V3 && analysis.v3Metadata && newRec) {
            await saveV3Metadata(supabase, newRec.id, analysis.v3Metadata);
          }
        }
      } else {
      }

      await supabase
        .from('products')
        .update({ last_analyzed_at: new Date().toISOString() })
        .eq('id', product.id);

    } catch (error) {
      console.error(`❌ Error analyzing product ${product.id}:`, error);
      console.error(`   Stack trace:`, error.stack);
    }
  }

  // ============================================
  // V3: SAVE PERSISTENCE STATE
  // ============================================
  if (USE_ALGORITHM_V3) {
    try {
      const shopId = allProducts[0]?.shop_id || null;
      await saveV3State(supabase, userId, shopId, regretBudgets, elasticityLearners);
    } catch (error) {
      console.error('⚠️ V3 state saving failed:', error.message);
    }
  }

  return recommendationsCreated;
}
// END DEPRECATED */













// ============ START SERVER ============

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
}
module.exports = app;
