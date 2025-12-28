// ============================================
// COMPLETE BACKEND - server.js
// REFACTORED VERSION - Using Supabase JS Client Only
// ============================================

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const { supabase } = require('./config/database');
const config = require('./config/environment');
const { AUTH_MODE, PORT, USE_ALGORITHM_V3, JWT_SECRET, ADMIN_SECRET } = config;
const corsMiddleware = require('./middleware/cors');
const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

// Import routes
const authRoutes = require('./routes/auth.routes');
const productsRoutes = require('./routes/products.routes');
const analysisRoutes = require('./routes/analysis.routes');
const recommendationsRoutes = require('./routes/recommendations.routes');
const adminRoutes = require('./routes/admin.routes');

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
console.log('\n🔐 ============================================');
console.log('   SHOPIFY AUTHENTICATION MODE');
console.log('============================================');

if (AUTH_MODE === 'manual') {
  console.log('📍 Mode: MANUAL (Development)');
  console.log('📋 Config:');
  console.log(`   - Shop: ${process.env.SHOP || '❌ NOT SET'}`);
  console.log(`   - Token: ${process.env.SHOPIFY_ACCESS_TOKEN ? '✅ Set (shpat_...)' : '❌ NOT SET'}`);
  console.log('💡 Using hardcoded credentials from .env file');

  if (!process.env.SHOP || !process.env.SHOPIFY_ACCESS_TOKEN) {
    console.log('\n⚠️  WARNING: SHOP and SHOPIFY_ACCESS_TOKEN must be set in .env');
    console.log('   Add these lines to backend/.env:');
    console.log('   SHOP=myteststore.myshopify.com');
    console.log('   SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx\n');
  }
} else if (AUTH_MODE === 'oauth') {
  console.log('📍 Mode: OAUTH (Production)');
  console.log('💡 Using dynamic tokens from shops table in database');
  console.log('📋 Tokens fetched per-request based on shop domain');
} else {
  console.log(`❌ INVALID MODE: "${AUTH_MODE}"`);
  console.log('   Set AUTH_MODE=manual or AUTH_MODE=oauth in .env');
}

console.log('============================================\n');

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
      imgSrc: ["'self'", "data:", "https:'],
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

app.use(cookieParser());

// CSRF protection for state-changing routes
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// GET /api/csrf-token - Get CSRF token for forms
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Apply CSRF to dangerous routes
app.use('/api/recommendations/:id/accept', csrfProtection);
app.use('/api/recommendations/:id/reject', csrfProtection);
app.use('/api/products/:id/cost-price', csrfProtection);
app.use('/api/admin/*', csrfProtection);

// Mount routes
app.use('/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/admin', adminRoutes);

// Error handler (must be last)
app.use(errorHandler);

// ============================================
// BACKEND PRICING ALGORITHM - RULE-COMPLIANT MVP
// ============================================
//
// ABSOLUTE RULES (NON-NEGOTIABLE):
// 1. Inventory may NEVER initiate a pricing decision
// 2. Data reliability must be evaluated BEFORE pricing logic
// 3. LOW reliability → PROTECTIVE ACTIONS ONLY
// 4. One product → one recommendation → one reason
// 5. Follow exact decision order: Safety → Mispricing → Otherwise (no change)

async function analyzeProduct(product, allProducts, userSettings, recentOrderData = {}, priceDecreaseHistory = {}) {

  // ============================================
  // STEP 1: PARSE RAW DATA
  // ============================================
  const costPrice = parseFloat(product.cost_price) || 0;
  const currentPrice = parseFloat(product.price);
  const salesVelocity = parseFloat(product.sales_velocity) || 0;
  const inventory = parseInt(product.inventory) || 0;
  const sales30d = parseInt(product.total_sales_30d) || 0;
  const revenue30d = parseFloat(product.revenue_30d) || 0;
  const sales7d = parseInt(recentOrderData[`sales7d_${product.id}`]) || Math.floor(sales30d / 4.3);
  // Use the actual realized selling price from the last 30 days to avoid misreading historical sales
  const observedAvgPrice = sales30d > 0 ? revenue30d / sales30d : currentPrice;

  const decreasesThisMonth = priceDecreaseHistory[product.id] || 0;
  const daysSinceLastAnalysis = product.last_analyzed_at
    ? (Date.now() - new Date(product.last_analyzed_at)) / (1000 * 60 * 60 * 24)
    : 999;

  console.log(`   [ALGORITHM] Parsed values: cost=$${costPrice}, price=$${currentPrice}`);
  console.log(`   [ALGORITHM] Sales data: 7d=${sales7d}, 30d=${sales30d}, velocity=${salesVelocity.toFixed(2)}/day`);
  console.log(`   [ALGORITHM] Observed avg selling price (30d) = $${observedAvgPrice.toFixed(2)}`);

  // ============================================
  // STEP 2: DATA RELIABILITY CLASSIFICATION
  // ============================================
  // MUST happen BEFORE any pricing logic

  let dataReliability = 'HIGH';
  const reliabilityIssues = [];

  // LOW reliability if ANY are true:
  if (!costPrice || costPrice <= 0) {
    dataReliability = 'LOW';
    reliabilityIssues.push('cost_price missing or zero');
  }

  // Extremely low lifetime sales (less than 5 total)
  if (sales30d < 5 && revenue30d < 50) {
    dataReliability = 'LOW';
    reliabilityIssues.push('insufficient sales history (< 5 units)');
  }

  // Invalid inventory (negative, absurdly large, or clearly fake)
  if (inventory < 0 || inventory > 100000) {
    dataReliability = 'LOW';
    reliabilityIssues.push(`invalid inventory (${inventory})`);
  }

  // MEDIUM if some concerns but not critical
  if (dataReliability === 'HIGH' && sales30d < 20) {
    dataReliability = 'MEDIUM';
    reliabilityIssues.push('limited sales data (< 20 units)');
  }

  console.log(`   [DATA RELIABILITY] ${dataReliability} ${reliabilityIssues.length > 0 ? `(${reliabilityIssues.join(', ')})` : ''}`);

  // ============================================
  // STEP 3: LOW RELIABILITY → PROTECTIVE ONLY
  // ============================================
  if (dataReliability === 'LOW') {
    console.log(`   [ALGORITHM] ⚠️ LOW data reliability - PROTECTIVE ACTIONS ONLY`);

    // ALLOWED: Prevent selling below cost
    if (currentPrice < costPrice) {
      const emergencyPrice = costPrice * 1.5;
      const increasePercent = ((emergencyPrice - currentPrice) / currentPrice * 100).toFixed(1);
      return {
        shouldChangePrice: true,
        recommendedPrice: emergencyPrice,
        reasoning: `🚨 EMERGENCY: Selling BELOW cost ($${currentPrice.toFixed(2)} < $${costPrice.toFixed(2)}). Sales data: ${sales30d} units sold (${salesVelocity.toFixed(2)}/day), but losing money on each sale. Raising to $${emergencyPrice.toFixed(2)} (+${increasePercent}%) to achieve 50% margin and stop losses. [Data reliability: LOW - protective action only]`,
        urgency: 'CRITICAL',
        confidence: 100,
        priceChange: emergencyPrice - currentPrice,
        changePercent: (emergencyPrice - currentPrice) / currentPrice * 100
      };
    }

    // ALLOWED: Raise to minimum safe margin (25%)
    const currentMargin = ((currentPrice - costPrice) / currentPrice) * 100;
    if (currentMargin < 25) {
      const safePrice = costPrice / (1 - 0.30); // 30% margin
      const cappedPrice = Math.min(safePrice, currentPrice * 1.20); // Max 20% increase
      const increasePercent = ((cappedPrice - currentPrice) / currentPrice * 100).toFixed(1);
      return {
        shouldChangePrice: true,
        recommendedPrice: cappedPrice,
        reasoning: `🛡️ MARGIN TOO LOW: Current ${currentMargin.toFixed(1)}% margin is below safe minimum. Sales data shows ${sales30d} units sold in 30 days (${salesVelocity.toFixed(2)}/day), but margins are too thin. Raising to $${cappedPrice.toFixed(2)} (+${increasePercent}%) to achieve 30% protective margin. [Data reliability: LOW - ${reliabilityIssues.join(', ')}]`,
        urgency: 'HIGH',
        confidence: 90,
        priceChange: cappedPrice - currentPrice,
        changePercent: (cappedPrice - currentPrice) / currentPrice * 100
      };
    }

    // FORBIDDEN with LOW data: decreases, experiments, aggressive increases
    console.log(`   [ALGORITHM] ✓ LOW reliability + safe margin → DO NOTHING`);
    return {
      shouldChangePrice: false,
      reasoning: `⚠️ INSUFFICIENT DATA: Cannot make confident pricing recommendation due to: ${reliabilityIssues.join(', ')}. Sales history: ${sales30d} units in 30 days (${salesVelocity.toFixed(2)}/day) is too limited. Current price $${currentPrice.toFixed(2)} (${currentMargin.toFixed(1)}% margin) appears safe. Need more sales history for optimization.`,
      confidence: 40
    };
  }

  // ============================================
  // STEP 4: CALCULATE PRICING VARIABLES
  // ============================================
  const priceForMargin = observedAvgPrice || currentPrice;
  const currentMargin = priceForMargin > 0 ? ((priceForMargin - costPrice) / priceForMargin) * 100 : 0;
  const currentMarkup = costPrice > 0 ? priceForMargin / costPrice : 0;

  // CONFIGURATION
  const MIN_MARGIN_PERCENT = 30;
  const MAX_MARGIN_PERCENT = 70;
  const TARGET_MARGIN = parseFloat(userSettings.target_margin) || 40;
  const MAX_MARKUP_RATIO = 5.0;
  const SUSPICIOUS_MARKUP = 10.0;
  const MAX_INCREASE_PERCENT = 0.20; // 20%
  const MAX_DECREASE_PERCENT = 0.25; // 25%
  const ZERO_SALES_THRESHOLD_7D = 0;

  console.log(`   [ALGORITHM] Margin: ${currentMargin.toFixed(1)}%, Markup: ${currentMarkup.toFixed(1)}x`);

  // ============================================
  // STEP 5: PRICING DECISION ORDER (DO NOT VIOLATE)
  // ============================================

  // ------------------------------------------
  // DECISION ORDER 1: SAFETY CHECKS
  // ------------------------------------------

  // Safety Check A: Selling BELOW cost (use observed selling price to catch historical underpricing)
  const belowCostObserved = priceForMargin < costPrice;
  const belowCostLive = currentPrice < costPrice;
  if (belowCostObserved || belowCostLive) {
    console.log(`   [ALGORITHM] dYs" SAFETY VIOLATION: Below cost`);
    const emergencyPrice = Math.max(costPrice * 1.5, currentPrice);
    const increasePercent = currentPrice > 0 ? ((emergencyPrice - currentPrice) / currentPrice * 100).toFixed(1) : 0;
    return {
      shouldChangePrice: true,
      recommendedPrice: emergencyPrice,
      reasoning: `dYs" CRITICAL: Selling BELOW cost! Cost: $${costPrice.toFixed(2)}, observed selling price (30d avg): $${priceForMargin.toFixed(2)}, current Shopify price: $${currentPrice.toFixed(2)}. Sales: ${sales30d} units in 30 days (${salesVelocity.toFixed(2)}/day), $${revenue30d.toFixed(2)} revenue - but losing money on every sale. Raising to $${emergencyPrice.toFixed(2)}${currentPrice ? ` (+${increasePercent}%)` : ''} to achieve a protective margin and stop losses immediately.`,
      urgency: 'CRITICAL',
      confidence: 100,
      priceChange: emergencyPrice - currentPrice,
      changePercent: (emergencyPrice - currentPrice) / currentPrice * 100
    };
  }

  // Safety Check B: Margin dangerously low
  if (currentMargin < MIN_MARGIN_PERCENT) {
    console.log(`   [ALGORITHM] 🛡️ SAFETY: Margin too low (${currentMargin.toFixed(1)}%)`);
    const targetPrice = costPrice / (1 - (TARGET_MARGIN / 100));
    const cappedPrice = Math.min(targetPrice, currentPrice * (1 + MAX_INCREASE_PERCENT));
    const increasePercent = ((cappedPrice - currentPrice) / currentPrice * 100).toFixed(1);

    // Inventory can only REINFORCE this decision (add minor confidence boost)
    // It CANNOT initiate or determine price magnitude
    let inventoryNote = '';
    if (inventory < 30 && salesVelocity > 0.5) {
      inventoryNote = ' Low stock reinforces this protective action.';
    }

    return {
      shouldChangePrice: true,
      recommendedPrice: cappedPrice,
      reasoning: `🛡️ MARGIN TOO LOW: Current margin ${currentMargin.toFixed(1)}% is below healthy minimum of ${MIN_MARGIN_PERCENT}%. Strong sales performance (${sales30d} units in 30 days, ${salesVelocity.toFixed(2)}/day, $${revenue30d.toFixed(2)} revenue) indicates price elasticity. Raising to $${cappedPrice.toFixed(2)} (+${increasePercent}%) to achieve ${TARGET_MARGIN}% target margin.${inventoryNote}`,
      urgency: 'HIGH',
      confidence: 95,
      priceChange: cappedPrice - currentPrice,
      changePercent: (cappedPrice - currentPrice) / currentPrice * 100
    };
  }

  // ------------------------------------------
  // DECISION ORDER 2: OBVIOUS MISPRICING
  // ------------------------------------------

  // Mispricing A: Zero sales for 7+ days (with sufficient data quality)
  if (sales7d === 0 && daysSinceLastAnalysis >= 7 && dataReliability === 'HIGH') {
    console.log(`   [ALGORITHM] 📉 MISPRICING: Zero sales for 7+ days`);

    // PROTECTION: Max 3 decreases per month
    if (decreasesThisMonth >= 3) {
      console.log(`   [ALGORITHM] ⚠️ BLOCKED: Price decrease limit reached (${decreasesThisMonth}/3)`);
      return {
        shouldChangePrice: false,
        reasoning: `⚠️ NO SALES IN 7 DAYS: Zero recent sales (${sales30d} total in 30 days, ${salesVelocity.toFixed(2)}/day average). Already made ${decreasesThisMonth} price decreases this month (max 3 for safety). Will retry next month. Current: $${currentPrice.toFixed(2)} (${currentMargin.toFixed(1)}% margin).`,
        confidence: 65
      };
    }

    // GRADUAL DISCOVERY: 10% → 15% → 20%
    let discountPercent = 0.10;
    if (decreasesThisMonth === 1) discountPercent = 0.15;
    if (decreasesThisMonth === 2) discountPercent = 0.20;

    const testPrice = currentPrice * (1 - discountPercent);
    const finalPrice = Math.max(testPrice, costPrice * 1.30); // Never below 30% margin
    const actualDecrease = ((currentPrice - finalPrice) / currentPrice * 100).toFixed(1);

    return {
      shouldChangePrice: true,
      recommendedPrice: finalPrice,
      reasoning: `📉 ZERO SALES IN 7 DAYS (Attempt ${decreasesThisMonth + 1}/3): Sales data shows ${sales30d} units in 30 days (${salesVelocity.toFixed(2)}/day), but 0 sales in last 7 days indicates price resistance. Testing ${actualDecrease}% price reduction to $${finalPrice.toFixed(2)} to discover optimal price point. Maintains 30%+ margin. ${3 - decreasesThisMonth - 1} attempts remaining this month.`,
      urgency: 'HIGH',
      confidence: 75,
      priceChange: finalPrice - currentPrice,
      changePercent: (finalPrice - currentPrice) / currentPrice * 100,
      isDecrease: true
    };
  }

  // Mispricing B: Extremely high margin + slow demand
  if (currentMargin > MAX_MARGIN_PERCENT && salesVelocity < 0.5) {
    console.log(`   [ALGORITHM] 💸 MISPRICING: Very high margin (${currentMargin.toFixed(1)}%) + slow sales`);
    const targetPrice = costPrice / (1 - (TARGET_MARGIN / 100));
    const cappedPrice = Math.max(targetPrice, currentPrice * (1 - MAX_DECREASE_PERCENT));
    const decreasePercent = ((currentPrice - cappedPrice) / currentPrice * 100).toFixed(1);

    return {
      shouldChangePrice: true,
      recommendedPrice: cappedPrice,
      reasoning: `💸 MARGIN TOO HIGH + SLOW SALES: Current margin ${currentMargin.toFixed(1)}% is above sustainable maximum of ${MAX_MARGIN_PERCENT}%. Sales data: only ${sales30d} units in 30 days (${salesVelocity.toFixed(2)}/day, $${revenue30d.toFixed(2)} revenue) indicates price is limiting demand. Lowering to $${cappedPrice.toFixed(2)} (-${decreasePercent}%) to achieve ${TARGET_MARGIN}% target margin and stimulate sales.`,
      urgency: 'MEDIUM',
      confidence: 85,
      priceChange: cappedPrice - currentPrice,
      changePercent: (cappedPrice - currentPrice) / currentPrice * 100
    };
  }

  // Mispricing C: Suspicious markup (pricing error detection)
  if (currentMarkup > SUSPICIOUS_MARKUP) {
    console.log(`   [ALGORITHM] ⚠️ MISPRICING: Suspicious markup (${currentMarkup.toFixed(1)}x)`);
    const reasonablePrice = costPrice * MAX_MARKUP_RATIO;
    const decreasePercent = ((currentPrice - reasonablePrice) / currentPrice * 100).toFixed(1);
    return {
      shouldChangePrice: true,
      recommendedPrice: reasonablePrice,
      reasoning: `⚠️ PRICING ERROR: Current markup of ${currentMarkup.toFixed(1)}x suggests possible mistake (price $${currentPrice.toFixed(2)} vs cost $${costPrice.toFixed(2)}). Sales: ${sales30d} units in 30 days (${salesVelocity.toFixed(2)}/day) at current price. Recommending $${reasonablePrice.toFixed(2)} (-${decreasePercent}%), which is a ${MAX_MARKUP_RATIO}x markup - still profitable but more realistic.`,
      urgency: 'HIGH',
      confidence: 85,
      priceChange: reasonablePrice - currentPrice,
      changePercent: (reasonablePrice - currentPrice) / currentPrice * 100
    };
  }

  // ------------------------------------------
  // DECISION ORDER 3: OTHERWISE → NO CHANGE
  // ------------------------------------------

  console.log(`   [ALGORITHM] ✓ No safety issues, no obvious mispricing → DO NOTHING`);

  // Inventory can provide context notes, but NEVER initiates change
  let statusNote = '';
  if (inventory < 30 && salesVelocity > 1.0) {
    statusNote = ` Low stock (${inventory} units, ~${(inventory / salesVelocity).toFixed(0)} days at current velocity) - monitor for restocking.`;
  } else if (inventory > 90 && salesVelocity < 0.5) {
    statusNote = ` High inventory (${inventory} units) with slow sales - consider promotions or bundling.`;
  }
  const priceNote = currentPrice !== priceForMargin ? ` (current Shopify price $${currentPrice.toFixed(2)})` : '';

  return {
    shouldChangePrice: false,
    reasoning: `PRICE IS OPTIMIZED: Actual selling price $${priceForMargin.toFixed(2)}${priceNote} with ${currentMargin.toFixed(1)}% margin is performing well. Sales data: ${sales30d} units sold in 30 days (${salesVelocity.toFixed(2)}/day), generating $${revenue30d.toFixed(2)} revenue. ${sales7d > 0 ? `Recent 7-day sales: ${sales7d} units shows continued demand.` : ''} Price point is balanced for profitability and demand.${statusNote}`,
    confidence: 80 + (dataReliability === 'HIGH' ? 10 : 0)
  };
}








// ============ HELPER FUNCTION FOR ANALYSIS ============

async function runAnalysisForUser(userId) {
  console.log(`🤖 Running analysis for user ${userId}`);

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
      console.log(`⚠️ User ${userId}: MANUAL MODE - SHOP and SHOPIFY_ACCESS_TOKEN not set in .env`);
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
      console.log(`⚠️ User ${userId}: No shop domain found in users table`);
      return;
    }

    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('access_token')
      .eq('shop_domain', user.shopify_shop)
      .eq('is_active', true)
      .single();

    if (shopError || !shopData) {
      console.log(`⚠️ User ${userId}: No OAuth token found for shop ${user.shopify_shop}`);
      return;
    }

    shop = user.shopify_shop;
    accessToken = shopData.access_token;
  }

  // ============================================
  // CRITICAL FIX: SYNC PRODUCTS BEFORE ANALYSIS
  // This ensures we have FRESH data, not stale data
  // ============================================
  console.log(`🔄 Syncing products from Shopify before analysis...`);

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

    console.log(`✅ Products synced: ${productsResponse.data.products.length} products updated with fresh sales data`);
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
    console.log(`⚠️ User ${userId}: No products selected for analysis`);
    return;
  }

  console.log(`📊 Analyzing ${products.length} selected products for user ${userId}`);

  const allProducts = products;
  const userSettings = { target_margin: 40 };

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

  console.log(`📉 Price decrease history loaded: ${Object.keys(priceDecreaseHistory).length} products have decreases this month`);

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
      console.log(`📚 Loading V3 state...`);
      regretBudgets = await loadRegretBudgets(supabase, userId);
      elasticityLearners = await loadElasticityLearners(supabase, userId);

      // Load price change observations for elasticity learning
      for (const product of allProducts) {
        const observations = await loadPriceChangeObservations(supabase, userId, product.id, 10);
        if (observations.length > 0) {
          priceHistory[product.id] = observations;
        }
      }

      console.log(`   ✅ Loaded: ${Object.keys(regretBudgets).length} budgets, ${Object.keys(elasticityLearners).length} learners, ${Object.keys(priceHistory).length} products with history`);
    } catch (error) {
      console.error('⚠️ V3 state loading failed (tables may not exist yet):', error.message);
      console.log('   ERROR: V3 tables missing! Cannot proceed without V3.');
      throw new Error('V3 tables not found - run migrations first');
    }
  }

  let recommendationsCreated = 0;

  for (const product of allProducts) {
    try {
      console.log(`\n🔍 Analyzing product: ${product.title} (ID: ${product.id})`);
      console.log(`   Raw data:`, {
        cost_price: product.cost_price,
        price: product.price,
        inventory: product.inventory,
        sales_velocity: product.sales_velocity
      });

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

      console.log(`   Analysis result:`, {
        shouldChangePrice: analysis.shouldChangePrice,
        recommendedPrice: analysis.recommendedPrice,
        urgency: analysis.urgency,
        confidence: analysis.confidence,
        algorithm: 'V3',
        error: analysis.error || 'none'
      });

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
          console.log(`   ✅ Recommendation created: $${product.price} → $${analysis.recommendedPrice}`);
          recommendationsCreated++;

          // Save V3 metadata if using V3
          if (USE_ALGORITHM_V3 && analysis.v3Metadata && newRec) {
            await saveV3Metadata(supabase, newRec.id, analysis.v3Metadata);
          }
        }
      } else {
        console.log(`   ✓ No price change needed`);
        console.log(`   Reasoning: ${analysis.reasoning || analysis.error || 'Unknown'}`);
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

  console.log(`\n✅ Analysis complete for user ${userId}: ${recommendationsCreated} recommendations created`);
  return recommendationsCreated;
}



// ============ BACKGROUND JOB - AUTO ANALYSIS ============
// NOTE: setInterval DOES NOT WORK on Vercel (serverless functions are stateless)
// Using cron-job.org for free scheduled tasks (runs every 30 minutes)
// Cron endpoint: /api/cron/auto-analysis (triggered by cron-job.org)

// CRON ENDPOINT - Runs every 30 minutes (triggered by cron-job.org)
app.get('/api/cron/auto-analysis', async (req, res) => {
  try {
    // Prevent rapid fire abuse (max 1 request per 20 minutes)
    const lastCronRun = global.lastCronRun || 0;
    const now = Date.now();
    const twentyMinutes = 20 * 60 * 1000;

    if (now - lastCronRun < twentyMinutes) {
      console.warn('⚠️ Cron called too frequently, rate limited');
      return res.status(429).json({
        error: 'Too many requests',
        nextAllowed: new Date(lastCronRun + twentyMinutes).toISOString()
      });
    }

    global.lastCronRun = now;

    // Verify this is actually Vercel calling (security check)
    const authHeader = req.headers.authorization;

    // Validate header format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Cron auth failed: Invalid header format');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract token
    const providedSecret = authHeader.slice(7); // Remove 'Bearer '
    const cronSecret = process.env.CRON_SECRET;

    // Validate secret exists
    if (!cronSecret || cronSecret.length < 32) {
      console.error('❌ CRON_SECRET not configured properly');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Timing-safe comparison
    try {
      if (!crypto.timingSafeEqual(
        Buffer.from(providedSecret),
        Buffer.from(cronSecret)
      )) {
        console.error('❌ Cron auth failed: Invalid secret');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } catch (err) {
      console.error('❌ Cron auth failed: Comparison error', err);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('✅ Cron authentication successful');
    console.log('⏰ [CRON] Running automatic analysis check...');

    const { data: dueUsers, error: dueError } = await supabase
      .from('analysis_schedule')
      .select('user_id')
      .lte('next_analysis_due', new Date().toISOString());

    if (dueError) {
      throw dueError;
    }

    console.log(`📊 [CRON] Found ${dueUsers ? dueUsers.length : 0} users due for analysis`);

    const results = {
      usersProcessed: 0,
      usersSucceeded: 0,
      usersFailed: 0,
      errors: []
    };

    if (dueUsers) {
      for (const row of dueUsers) {
        const userId = row.user_id;
        results.usersProcessed++;

        try {
          console.log(`🤖 [CRON] Processing user ${userId}...`);
          await runAnalysisForUser(userId);

          const now = new Date();
          const nextDue = getNextCronTime(); // Align with cron schedule (:00 and :30)

          await supabase
            .from('analysis_schedule')
            .update({
              last_analysis_run: now.toISOString(),
              next_analysis_due: nextDue.toISOString()
            })
            .eq('user_id', userId);

          results.usersSucceeded++;
          console.log(`✅ [CRON] User ${userId}: Analysis completed, next due at ${nextDue.toISOString()}`);
        } catch (error) {
          results.usersFailed++;
          results.errors.push({ userId, error: error.message });
          console.error(`❌ [CRON] Error running analysis for user ${userId}:`, error);
        }
      }
    }

    console.log(`✅ [CRON] Auto-analysis complete: ${results.usersSucceeded}/${results.usersProcessed} succeeded`);
    return res.status(200).json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [CRON] Background analysis job error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});









// ============ START SERVER ============

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Local server on ${PORT}`));
}
module.exports = app;
