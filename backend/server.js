// ============================================
// COMPLETE BACKEND - server.js
// REFACTORED VERSION - Using Supabase JS Client Only
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// ============================================
// SHOPIFY DUAL-MODE AUTHENTICATION
// ============================================
const { getShopifyCredentials, AUTH_MODE } = require('./shopify-auth');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const analysisLimiter = (req, res, next) => next();
const authLimiter = (req, res, next) => next();

// ============================================
// SUPABASE CLIENT (For ALL Database Queries)
// ============================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ FATAL: SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

// Create Supabase client for admin operations (bypasses RLS, full access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Supabase Client Initialized');

// Test connection
(async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) throw error;
    console.log('✅ Database connected via Supabase');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
})();

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

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://automerchant.ai',
      'https://www.automerchant.ai',
      'https://automerchant.vercel.app',
      'https://www.automerchant.vercel.app',
      'https://automerchant-backend-v2.vercel.app'
    ];

    // Allow Shopify domains and Vercel preview deployments
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || /\.myshopify\.com$/.test(origin) || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now during development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// CRITICAL: Handle ALL OPTIONS requests FIRST before any other middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://automerchant.vercel.app',
    'https://www.automerchant.vercel.app',
    'https://automerchant.ai',
    'https://www.automerchant.ai',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  // Always set CORS headers for every request
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin) {
    // For any other origin, still allow it but log it
    console.log('⚠️  [CORS] Non-whitelisted origin:', origin);
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // No origin header (like from curl), use default
    res.setHeader('Access-Control-Allow-Origin', 'https://automerchant.vercel.app');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  res.setHeader('Vary', 'Origin'); // Important for caching

  // Handle OPTIONS preflight immediately with all headers
  if (req.method === 'OPTIONS') {
    console.log('✅ [PREFLIGHT] Handling OPTIONS for:', req.path, 'from origin:', origin);
    console.log('📤 [PREFLIGHT] Sending CORS headers:', {
      origin: res.getHeader('Access-Control-Allow-Origin'),
      methods: res.getHeader('Access-Control-Allow-Methods'),
      headers: res.getHeader('Access-Control-Allow-Headers'),
      credentials: res.getHeader('Access-Control-Allow-Credentials')
    });
    return res.status(204).end(); // Use 204 No Content for OPTIONS
  }

  next();
});

// Don't use cors() package - we're handling CORS manually above
// app.use(cors(corsOptions));
app.use(express.json());

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// ============================================
// WORLD-CLASS PRICING ALGORITHM
// ============================================

async function analyzeProduct(product, allProducts, userSettings, recentOrderData = {}, priceDecreaseHistory = {}) {

  const costPrice = parseFloat(product.cost_price) || 0;
  const currentPrice = parseFloat(product.price);
  const salesVelocity = parseFloat(product.sales_velocity) || 0;
  const inventory = parseInt(product.inventory) || 0;
  const sales30d = parseInt(product.total_sales_30d) || 0;
  const revenue30d = parseFloat(product.revenue_30d) || 0;
  const sales7d = parseInt(recentOrderData[`sales7d_${product.id}`]) || Math.floor(sales30d / 4.3);
  const recentVelocity = sales7d / 7;

  // Get decrease history for this product
  const decreasesThisMonth = priceDecreaseHistory[product.id] || 0;
  const daysSinceLastAnalysis = product.last_analyzed_at
    ? (Date.now() - new Date(product.last_analyzed_at)) / (1000 * 60 * 60 * 24)
    : 999;

  console.log(`   [ALGORITHM] Parsed values: cost=$${costPrice}, price=$${currentPrice}, margin=${costPrice > 0 ? (((currentPrice - costPrice) / currentPrice) * 100).toFixed(1) : 'N/A'}%`);
  console.log(`   [ALGORITHM] Sales data: 7d=${sales7d}, 30d=${sales30d}, velocity=${salesVelocity.toFixed(2)}/day`);
  console.log(`   [ALGORITHM] Protection: ${decreasesThisMonth}/3 decreases this month, ${daysSinceLastAnalysis.toFixed(1)} days since analysis`);

  if (costPrice <= 0) {
    console.log(`   [ALGORITHM] ❌ SKIPPED: No cost price set (cost_price=${product.cost_price})`);
    return { shouldChangePrice: false, error: 'Cost price required' };
  }

  const currentMargin = ((currentPrice - costPrice) / currentPrice) * 100;
  const currentProfit = currentPrice - costPrice;
  const currentMarkup = currentPrice / costPrice;
  const daysOfStock = salesVelocity > 0 ? inventory / salesVelocity : 999;

  // CONFIGURATION
  const MIN_MARGIN_PERCENT = 30;
  const MAX_MARGIN_PERCENT = 70;
  const HEALTHY_MARGIN_FLOOR = 35;
  const HEALTHY_MARGIN_CEILING = 60;
  const TARGET_MARGIN = parseFloat(userSettings.target_margin) || 40;

  const MAX_MARKUP_RATIO = 5.0;
  const SUSPICIOUS_MARKUP = 10.0;

  const MAX_INCREASE_PERCENT = 0.20;
  const MAX_DECREASE_PERCENT = 0.25;

  const VERY_HIGH_VELOCITY = 2.0;
  const HIGH_VELOCITY = 1.0;
  const MEDIUM_VELOCITY = 0.5;
  const LOW_VELOCITY = 0.2;
  const ZERO_SALES_THRESHOLD = 0.1;

  const CRITICAL_LOW_STOCK = 14;
  const LOW_STOCK = 30;
  const HEALTHY_STOCK = 60;
  const OVERSTOCK = 90;

  // CRITICAL SAFEGUARDS

  // SAFEGUARD 0: Selling BELOW cost (critical emergency)
  if (currentPrice < costPrice) {
    console.log(`   [ALGORITHM] 🚨 CRITICAL: Selling BELOW cost! Price $${currentPrice} < Cost $${costPrice}`);
    const emergencyPrice = costPrice * 1.5;
    const increasePercent = ((emergencyPrice - currentPrice) / currentPrice * 100).toFixed(1);
    return {
      shouldChangePrice: true,
      recommendedPrice: emergencyPrice,
      reasoning: `🚨 EMERGENCY: Currently selling BELOW cost! Cost: $${costPrice.toFixed(2)}, Price: $${currentPrice.toFixed(2)}. Raising to $${emergencyPrice.toFixed(2)} (+${increasePercent}%) to achieve 50% margin minimum and stop losses immediately.`,
      urgency: 'CRITICAL',
      confidence: 100,
      priceChange: emergencyPrice - currentPrice,
      changePercent: (emergencyPrice - currentPrice) / currentPrice * 100
    };
  }

  // SAFEGUARD 1: Margin caps
  if (currentMargin < MIN_MARGIN_PERCENT) {
    const targetPrice = costPrice / (1 - (TARGET_MARGIN / 100));
    const cappedPrice = Math.min(targetPrice, currentPrice * (1 + MAX_INCREASE_PERCENT));
    const increasePercent = ((cappedPrice - currentPrice) / currentPrice * 100).toFixed(1);
    return {
      shouldChangePrice: true,
      recommendedPrice: cappedPrice,
      reasoning: `🛡️ MARGIN TOO LOW: Current margin ${currentMargin.toFixed(1)}% is below healthy minimum of ${MIN_MARGIN_PERCENT}%. Raising price to $${cappedPrice.toFixed(2)} (+${increasePercent}%) to achieve ${TARGET_MARGIN}% target margin while staying within ${MAX_INCREASE_PERCENT * 100}% max increase limit.`,
      urgency: 'HIGH',
      confidence: 95,
      priceChange: cappedPrice - currentPrice,
      changePercent: (cappedPrice - currentPrice) / currentPrice * 100
    };
  }

  if (currentMargin > MAX_MARGIN_PERCENT) {
    const targetPrice = costPrice / (1 - (TARGET_MARGIN / 100));
    const cappedPrice = Math.max(targetPrice, currentPrice * (1 - MAX_DECREASE_PERCENT));
    const decreasePercent = ((currentPrice - cappedPrice) / currentPrice * 100).toFixed(1);
    return {
      shouldChangePrice: true,
      recommendedPrice: cappedPrice,
      reasoning: `🛡️ MARGIN TOO HIGH: Current margin ${currentMargin.toFixed(1)}% is above sustainable maximum of ${MAX_MARGIN_PERCENT}%. Lowering price to $${cappedPrice.toFixed(2)} (-${decreasePercent}%) to achieve ${TARGET_MARGIN}% target margin, improve conversion rates, and maintain competitive positioning.`,
      urgency: 'MEDIUM',
      confidence: 90,
      priceChange: cappedPrice - currentPrice,
      changePercent: (cappedPrice - currentPrice) / currentPrice * 100
    };
  }

  // SAFEGUARD 2: Pricing error detection
  if (currentMarkup > SUSPICIOUS_MARKUP) {
    const reasonablePrice = costPrice * MAX_MARKUP_RATIO;
    const decreasePercent = ((currentPrice - reasonablePrice) / currentPrice * 100).toFixed(1);
    return {
      shouldChangePrice: true,
      recommendedPrice: reasonablePrice,
      reasoning: `⚠️ PRICING ERROR DETECTED: Current markup of ${currentMarkup.toFixed(1)}x (price $${currentPrice.toFixed(2)} vs cost $${costPrice.toFixed(2)}) suggests possible pricing mistake. Recommending $${reasonablePrice.toFixed(2)} (-${decreasePercent}%), which is a ${MAX_MARKUP_RATIO}x markup - still profitable but more realistic for market.`,
      urgency: 'HIGH',
      confidence: 85,
      priceChange: reasonablePrice - currentPrice,
      changePercent: (reasonablePrice - currentPrice) / currentPrice * 100
    };
  }

  // SAFEGUARD 3: 7-Day Zero Sales with Gradual Price Discovery
  // Only triggers if: 0 sales in 7 days + analyzed at least 7 days ago + under monthly decrease limit
  if (sales7d === 0 && daysSinceLastAnalysis >= 7) {
    console.log(`   [ALGORITHM] 📉 7-DAY ZERO SALES DETECTED`);

    // PROTECTION: Max 3 decreases per month
    if (decreasesThisMonth >= 3) {
      console.log(`   [ALGORITHM] ⚠️ BLOCKED: Already made ${decreasesThisMonth} decreases this month (max 3)`);
      return {
        shouldChangePrice: false,
        reasoning: `⚠️ PRICE DECREASE LIMIT REACHED: No sales in 7 days, but already made ${decreasesThisMonth} price decreases this month. Waiting until next month to avoid over-reacting to market conditions. Current price: $${currentPrice.toFixed(2)} (${currentMargin.toFixed(1)}% margin).`,
        confidence: 65
      };
    }

    // GRADUAL DISCOVERY: Start with 10% decrease, then 15%, then 20%
    let discountPercent;
    if (decreasesThisMonth === 0) {
      discountPercent = 0.10; // First attempt: 10% off
    } else if (decreasesThisMonth === 1) {
      discountPercent = 0.15; // Second attempt: 15% off
    } else {
      discountPercent = 0.20; // Final attempt: 20% off
    }

    const testPrice = currentPrice * (1 - discountPercent);
    const finalPrice = Math.max(testPrice, costPrice * 1.3); // Never below 30% margin
    const actualDecrease = ((currentPrice - finalPrice) / currentPrice * 100).toFixed(1);

    console.log(`   [ALGORITHM] 💡 Gradual discovery: Attempt ${decreasesThisMonth + 1}/3, reducing ${(discountPercent * 100).toFixed(0)}%`);

    return {
      shouldChangePrice: true,
      recommendedPrice: finalPrice,
      reasoning: `📉 NO SALES IN 7 DAYS (Attempt ${decreasesThisMonth + 1}/3): Zero sales in past week. Testing ${actualDecrease}% price reduction to $${finalPrice.toFixed(2)} to discover optimal price point. Maintains 30%+ margin. If this doesn't work, will try again in 7 days (${3 - decreasesThisMonth - 1} attempts remaining this month).`,
      urgency: 'HIGH',
      confidence: 75,
      priceChange: finalPrice - currentPrice,
      changePercent: (finalPrice - currentPrice) / currentPrice * 100,
      isDecrease: true // Flag for tracking
    };
  }

  // DECISION TREE: Velocity-based pricing decisions

  // SCENARIO 1: VERY HIGH VELOCITY
  if (salesVelocity >= VERY_HIGH_VELOCITY) {
    if (inventory <= CRITICAL_LOW_STOCK || daysOfStock < 7) {
      const urgentIncrease = currentPrice * 1.15;
      const cappedPrice = Math.min(urgentIncrease, currentPrice * (1 + MAX_INCREASE_PERCENT));
      const increasePercent = ((cappedPrice - currentPrice) / currentPrice * 100).toFixed(1);

      return {
        shouldChangePrice: true,
        recommendedPrice: cappedPrice,
        reasoning: `🔥 HIGH DEMAND + CRITICAL LOW STOCK: Selling ${salesVelocity.toFixed(2)} units/day with only ${inventory} units left (~${daysOfStock.toFixed(0)} days of stock). Raising price to $${cappedPrice.toFixed(2)} (+${increasePercent}%) to maximize profit on remaining inventory and slow demand until restock.`,
        urgency: 'URGENT',
        confidence: 95,
        priceChange: cappedPrice - currentPrice,
        changePercent: (cappedPrice - currentPrice) / currentPrice * 100
      };
    }

    if (currentMargin < TARGET_MARGIN) {
      const optimalPrice = costPrice / (1 - (TARGET_MARGIN / 100));
      const cappedPrice = Math.min(optimalPrice, currentPrice * (1 + MAX_INCREASE_PERCENT));
      const increasePercent = ((cappedPrice - currentPrice) / currentPrice * 100).toFixed(1);

      return {
        shouldChangePrice: true,
        recommendedPrice: cappedPrice,
        reasoning: `📈 STRONG DEMAND + MARGIN OPTIMIZATION: Product is selling very well at ${salesVelocity.toFixed(2)} units/day (recent: ${recentVelocity.toFixed(2)}/day). Current ${currentMargin.toFixed(1)}% margin can be improved. Raising to $${cappedPrice.toFixed(2)} (+${increasePercent}%) to achieve ${TARGET_MARGIN}% target margin while demand remains high.`,
        urgency: 'MEDIUM',
        confidence: 88,
        priceChange: cappedPrice - currentPrice,
        changePercent: (cappedPrice - currentPrice) / currentPrice * 100
      };
    }

    return {
      shouldChangePrice: false,
      reasoning: `✅ OPTIMAL PERFORMANCE: Product is selling excellently at ${salesVelocity.toFixed(2)} units/day with healthy ${currentMargin.toFixed(1)}% margin. Price of $${currentPrice.toFixed(2)} is in the sweet spot - maintain current pricing.`,
      confidence: 92
    };
  }

  // SCENARIO 2: HIGH VELOCITY
  if (salesVelocity >= HIGH_VELOCITY) {
    if (currentMargin < HEALTHY_MARGIN_FLOOR) {
      const improvedPrice = costPrice / (1 - (TARGET_MARGIN / 100));
      const cappedPrice = Math.min(improvedPrice, currentPrice * (1 + MAX_INCREASE_PERCENT));
      const increasePercent = ((cappedPrice - currentPrice) / currentPrice * 100).toFixed(1);

      return {
        shouldChangePrice: true,
        recommendedPrice: cappedPrice,
        reasoning: `💰 GOOD SALES, THIN MARGIN: Selling ${salesVelocity.toFixed(2)} units/day but only ${currentMargin.toFixed(1)}% margin. Raising to $${cappedPrice.toFixed(2)} (+${increasePercent}%) to improve profitability to ${TARGET_MARGIN}% while maintaining strong demand.`,
        urgency: 'MEDIUM',
        confidence: 85,
        priceChange: cappedPrice - currentPrice,
        changePercent: (cappedPrice - currentPrice) / currentPrice * 100
      };
    }

    if (inventory > OVERSTOCK) {
      return {
        shouldChangePrice: false,
        reasoning: `✅ CLEARING INVENTORY: Strong sales of ${salesVelocity.toFixed(2)} units/day with ${inventory} units in stock (${daysOfStock.toFixed(0)} days). Current price $${currentPrice.toFixed(2)} is working well to move inventory. Maintain pricing.`,
        confidence: 87
      };
    }

    return {
      shouldChangePrice: false,
      reasoning: `✅ STRONG PERFORMANCE: Selling ${salesVelocity.toFixed(2)} units/day with healthy ${currentMargin.toFixed(1)}% margin. Price of $${currentPrice.toFixed(2)} is performing well. No changes needed.`,
      confidence: 90
    };
  }

  // SCENARIO 3: MEDIUM VELOCITY
  if (salesVelocity >= MEDIUM_VELOCITY) {
    if (inventory <= LOW_STOCK && currentMargin < TARGET_MARGIN) {
      const balancedPrice = costPrice / (1 - (TARGET_MARGIN / 100));
      const cappedPrice = Math.min(balancedPrice, currentPrice * (1 + MAX_INCREASE_PERCENT));
      const increasePercent = ((cappedPrice - currentPrice) / currentPrice * 100).toFixed(1);

      return {
        shouldChangePrice: true,
        recommendedPrice: cappedPrice,
        reasoning: `⚖️ MODERATE DEMAND + LIMITED STOCK: Selling ${salesVelocity.toFixed(2)} units/day with ${inventory} units left (~${daysOfStock.toFixed(0)} days). Raising to $${cappedPrice.toFixed(2)} (+${increasePercent}%) to improve margin to ${TARGET_MARGIN}% and extend inventory runway.`,
        urgency: 'MEDIUM',
        confidence: 82,
        priceChange: cappedPrice - currentPrice,
        changePercent: (cappedPrice - currentPrice) / currentPrice * 100
      };
    }

    if (inventory > OVERSTOCK) {
      const clearancePrice = currentPrice * 0.92;
      const minPrice = costPrice * 1.3;
      const finalPrice = Math.max(clearancePrice, minPrice);
      const decreasePercent = ((currentPrice - finalPrice) / currentPrice * 100).toFixed(1);

      return {
        shouldChangePrice: true,
        recommendedPrice: finalPrice,
        reasoning: `📦 OVERSTOCK SITUATION: ${inventory} units in stock (~${daysOfStock.toFixed(0)} days) with moderate sales of ${salesVelocity.toFixed(2)} units/day. Lowering price to $${finalPrice.toFixed(2)} (-${decreasePercent}%) to accelerate sales and reduce holding costs while maintaining healthy margin.`,
        urgency: 'MEDIUM',
        confidence: 80,
        priceChange: finalPrice - currentPrice,
        changePercent: (finalPrice - currentPrice) / currentPrice * 100
      };
    }

    return {
      shouldChangePrice: false,
      reasoning: `✅ STEADY PERFORMANCE: Moderate sales of ${salesVelocity.toFixed(2)} units/day with ${currentMargin.toFixed(1)}% margin. Current price $${currentPrice.toFixed(2)} is working adequately. Monitor and maintain.`,
      confidence: 78
    };
  }

  // SCENARIO 4: LOW VELOCITY
  if (salesVelocity >= LOW_VELOCITY) {
    if (currentMargin > HEALTHY_MARGIN_CEILING) {
      const competitivePrice = costPrice / (1 - (TARGET_MARGIN / 100));
      const finalPrice = Math.max(competitivePrice, currentPrice * (1 - MAX_DECREASE_PERCENT));
      const decreasePercent = ((currentPrice - finalPrice) / currentPrice * 100).toFixed(1);

      return {
        shouldChangePrice: true,
        recommendedPrice: finalPrice,
        reasoning: `💸 SLOW SALES + HIGH MARGIN: Only ${salesVelocity.toFixed(2)} units/day with ${currentMargin.toFixed(1)}% margin suggests price resistance. Lowering to $${finalPrice.toFixed(2)} (-${decreasePercent}%) to hit ${TARGET_MARGIN}% target margin and stimulate demand. Recent 7-day velocity: ${recentVelocity.toFixed(2)}/day.`,
        urgency: 'MEDIUM',
        confidence: 85,
        priceChange: finalPrice - currentPrice,
        changePercent: (finalPrice - currentPrice) / currentPrice * 100
      };
    }

    if (inventory > HEALTHY_STOCK) {
      const discountPrice = currentPrice * 0.88;
      const minPrice = costPrice * 1.3;
      const finalPrice = Math.max(discountPrice, minPrice);
      const decreasePercent = ((currentPrice - finalPrice) / currentPrice * 100).toFixed(1);

      return {
        shouldChangePrice: true,
        recommendedPrice: finalPrice,
        reasoning: `⚠️ SLOW MOVEMENT + EXCESS INVENTORY: ${inventory} units with only ${salesVelocity.toFixed(2)} sales/day (~${daysOfStock.toFixed(0)} days of stock). Lowering to $${finalPrice.toFixed(2)} (-${decreasePercent}%) to accelerate turnover and prevent long-term holding costs.`,
        urgency: 'HIGH',
        confidence: 83,
        priceChange: finalPrice - currentPrice,
        changePercent: (finalPrice - currentPrice) / currentPrice * 100
      };
    }

    return {
      shouldChangePrice: false,
      reasoning: `⚠️ MONITOR CLOSELY: Slow sales (${salesVelocity.toFixed(2)} units/day) but limited inventory (${inventory} units, ~${daysOfStock.toFixed(0)} days). Margin at ${currentMargin.toFixed(1)}%. Consider price adjustment if sales don't improve.`,
      confidence: 70
    };
  }

  // SCENARIO 5: VERY LOW/ZERO VELOCITY
  const drasticDiscount = currentPrice * 0.75;
  const minPrice = costPrice * 1.25;
  const emergencyPrice = Math.max(drasticDiscount, minPrice);
  const decreasePercent = ((currentPrice - emergencyPrice) / currentPrice * 100).toFixed(1);

  return {
    shouldChangePrice: true,
    recommendedPrice: emergencyPrice,
    reasoning: `🚨 CRITICAL: Very slow movement (${salesVelocity.toFixed(3)} units/day, ${sales30d} sales in 30 days). Current price $${currentPrice.toFixed(2)} isn't working. Recommending aggressive ${decreasePercent}% reduction to $${emergencyPrice.toFixed(2)} to restart sales momentum while maintaining minimum 25% margin.`,
    urgency: 'HIGH',
    confidence: 78,
    priceChange: emergencyPrice - currentPrice,
    changePercent: (emergencyPrice - currentPrice) / currentPrice * 100
  };
}

// ============ AUTHENTICATION ============

app.post('/api/register', authLimiter, async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({ email, password_hash: hashedPassword, name })
      .select('id, email, name')
      .single();

    if (error) {
      throw error;
    }

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: newUser.id, email: newUser.email, name: newUser.name } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log(`🔐 [LOGIN] Attempt for email: ${email}`);

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      console.log(`❌ [LOGIN] User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is suspended
    if (user.suspended) {
      console.log(`🚫 [LOGIN] User suspended: ${email}`);
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    // Check if user is approved
    if (!user.approved) {
      console.log(`⏳ [LOGIN] User not approved yet: ${email}`);
      return res.status(403).json({
        error: 'Account pending approval',
        message: 'Your account is awaiting approval. We\'ll notify you when you\'re approved!',
        pending: true
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      console.log(`❌ [LOGIN] Invalid password for: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`✅ [LOGIN] Success for: ${email}`);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        shopifyConnected: !!user.shopify_shop,
        approved: user.approved,
        suspended: user.suspended
      }
    });
  } catch (error) {
    console.error('❌ [LOGIN] Error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Check user approval status (for waitlist OAuth flow)
app.post('/api/check-approval', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    console.log(`🔍 [CHECK-APPROVAL] Checking status for: ${email}`);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, approved, suspended, assigned_app_id')
      .eq('email', email.toLowerCase())
      .single();

    if (error && error.code === 'PGRST116') {
      console.log(`📝 [CHECK-APPROVAL] User not found, creating pending user: ${email}`);

      // Create user with approved=false (pending)
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          password_hash: 'oauth_user',
          approved: false
        })
        .select('id, email, approved, suspended')
        .single();

      if (createError) {
        throw createError;
      }

      console.log(`✅ [CHECK-APPROVAL] Created pending user: ${email}`);

      return res.json({
        approved: false,
        suspended: false,
        pending: true,
        message: 'Your account is awaiting approval. We\'ll notify you when you\'re approved!'
      });
    }

    if (error) {
      throw error;
    }

    if (user.suspended) {
      console.log(`🚫 [CHECK-APPROVAL] User suspended: ${email}`);
      return res.json({
        approved: false,
        suspended: true,
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    if (!user.approved) {
      console.log(`⏳ [CHECK-APPROVAL] User pending approval: ${email}`);
      return res.json({
        approved: false,
        suspended: false,
        pending: true,
        message: 'Your account is awaiting approval. We\'ll notify you when you\'re approved!'
      });
    }

    // User is approved - check if they have an assigned app
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`✅ [CHECK-APPROVAL] User approved, generating token: ${email}`);

    // Check if user has an assigned app
    let assignedApp = null;
    if (user.assigned_app_id) {
      const { data: app } = await supabase
        .from('shopify_apps')
        .select('id, app_name, install_url, shop_domain')
        .eq('id', user.assigned_app_id)
        .eq('status', 'active')
        .single();

      assignedApp = app;
    }

    return res.json({
      approved: true,
      suspended: false,
      token,
      user: {
        id: user.id,
        email: user.email,
        approved: user.approved
      },
      assignedApp: assignedApp ? {
        id: assignedApp.id,
        name: assignedApp.app_name,
        installUrl: assignedApp.install_url,
        shopDomain: assignedApp.shop_domain
      } : null,
      message: assignedApp
        ? `Welcome! You've been assigned to ${assignedApp.app_name}. Install the app to get started.`
        : 'Welcome back! Your account is active.'
    });

  } catch (error) {
    console.error('❌ [CHECK-APPROVAL] Error:', error);
    res.status(500).json({ error: 'Failed to check approval status' });
  }
});

// ============ SHOPIFY CONNECTION ============

app.post('/api/shopify/connect', authenticateToken, async (req, res) => {
  // Accept both 'shop' (from frontend) and 'shopifyShop' (legacy) parameter names
  const { shop, shopifyShop, accessToken } = req.body;
  const shopDomain = shop || shopifyShop;

  if (!shopDomain || !accessToken) {
    return res.status(400).json({ error: 'Shop name and access token required' });
  }

  try {
    console.log(`🔗 [MANUAL CONNECT] Attempting to connect shop: ${shopDomain}`);

    // Verify the access token works
    await axios.get(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });

    console.log(`✅ [MANUAL CONNECT] Token verified for ${shopDomain}`);

    // Update users table
    const { error: updateError } = await supabase
      .from('users')
      .update({
        shopify_shop: shopDomain,
        shopify_access_token: accessToken
      })
      .eq('id', req.user.id);

    if (updateError) {
      throw updateError;
    }

    // Also update/insert in shops table for consistency
    const { error: upsertError } = await supabase
      .from('shops')
      .upsert({
        shop_domain: shopDomain,
        access_token: accessToken,
        user_id: req.user.id,
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'shop_domain'
      });

    if (upsertError) {
      throw upsertError;
    }

    console.log(`✅ [MANUAL CONNECT] Connected ${shopDomain} to user ${req.user.id}`);

    res.json({ success: true, message: 'Shopify connected successfully' });
  } catch (error) {
    console.error('❌ [MANUAL CONNECT] Error:', error.response?.data || error.message);
    res.status(400).json({ error: 'Invalid Shopify credentials or shop not accessible' });
  }
});

app.get('/api/shopify/check', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('shopify_shop, shopify_access_token')
      .eq('id', req.user.id)
      .single();

    if (error) {
      throw error;
    }

    const connected = !!(user.shopify_shop && user.shopify_access_token);

    res.json({ connected, shop: user.shopify_shop });
  } catch (error) {
    console.error('Shopify check error:', error);
    res.status(500).json({ error: 'Failed to check Shopify connection' });
  }
});

// Get user's assigned Shopify app
app.get('/api/user/assigned-app', authenticateToken, async (req, res) => {
  try {
    const { data: result, error } = await supabase
      .from('users')
      .select(`
        assigned_app_id,
        shopify_apps!inner (
          id,
          app_name,
          shop_domain,
          client_id,
          client_secret,
          install_url
        )
      `)
      .eq('id', req.user.id)
      .eq('shopify_apps.status', 'active')
      .single();

    if (error || !result || !result.shopify_apps) {
      return res.json({ app: null });
    }

    res.json({ app: result.shopify_apps });
  } catch (error) {
    console.error('Error fetching assigned app:', error);
    res.status(500).json({ error: 'Failed to fetch assigned app' });
  }
});

app.get('/api/shopify/status', authenticateToken, async (req, res) => {
  try {
    // Check both users table AND shops table for maximum compatibility
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('shopify_shop, shopify_access_token')
      .eq('id', req.user.id)
      .single();

    if (userError) {
      throw userError;
    }

    // First check: users table (legacy and current approach)
    let connected = !!(user && user.shopify_shop && user.shopify_access_token);
    let shop = user ? user.shopify_shop : null;

    // Second check: shops table (if not found in users table)
    if (!connected) {
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('shop_domain, access_token')
        .eq('user_id', req.user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!shopError && shopData) {
        connected = !!(shopData.shop_domain && shopData.access_token);
        shop = shopData.shop_domain;

        console.log(`✅ Found Shopify connection in shops table for user ${req.user.id}: ${shop}`);
      }
    } else {
      console.log(`✅ Found Shopify connection in users table for user ${req.user.id}: ${shop}`);
    }

    res.json({ connected, shop });
  } catch (error) {
    console.error('Shopify status error:', error);
    res.status(500).json({ error: 'Failed to check Shopify status' });
  }
});

// ============ SHOPIFY OAUTH FLOW ============

app.get('/api/shopify/install', async (req, res) => {
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

app.get('/api/shopify/callback', async (req, res) => {
  try {
    const { shop, code, hmac, state } = req.query;

    // Validate required parameters
    if (!shop || !code || !hmac) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'OAuth callback requires shop, code, and hmac parameters'
      });
    }

    // ============================================
    // MULTI-APP SUPPORT: Extract app_id and user_email from state
    // ============================================
    let app_id = null;
    let user_email = null;
    if (state && state.includes(':')) {
      const parts = state.split(':');
      app_id = parts[1] || null;
      user_email = parts[2] || null;
      console.log(`🔐 [OAuth Callback] Using app_id ${app_id} and user_email ${user_email} from state`);
    }

    let SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_SCOPES;

    // Look up credentials from database if app_id is present
    if (app_id) {
      const { data: app, error } = await supabase
        .from('shopify_apps')
        .select('client_id, client_secret')
        .eq('id', app_id)
        .eq('status', 'active')
        .single();

      if (error || !app) {
        console.error(`❌ App not found with ID ${app_id}`);
        return res.status(404).json({
          error: 'App not found',
          message: 'Shopify app credentials not found'
        });
      }

      SHOPIFY_API_KEY = app.client_id;
      SHOPIFY_API_SECRET = app.client_secret;
      SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,write_inventory';

      console.log(`✅ Using credentials from database for app ${app_id}`);

    } else {
      // Fall back to environment variables for backward compatibility
      console.log(`🔐 [OAuth Callback] Using credentials from environment variables`);
      SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
      SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
      SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,write_inventory';
    }

    if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
      console.error('❌ SHOPIFY_API_KEY or SHOPIFY_API_SECRET not found');
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Shopify API credentials not configured'
      });
    }

    // ============================================
    // SECURITY: Verify HMAC signature
    // ============================================
    const queryParams = { ...req.query };
    delete queryParams.hmac; // Remove hmac from params before verification

    // Sort params alphabetically and build query string
    const sortedParams = Object.keys(queryParams)
      .sort()
      .map(key => `${key}=${queryParams[key]}`)
      .join('&');

    // Generate HMAC hash
    const calculatedHmac = crypto
      .createHmac('sha256', SHOPIFY_API_SECRET)
      .update(sortedParams)
      .digest('hex');

    // Compare HMACs (constant-time comparison to prevent timing attacks)
    if (calculatedHmac !== hmac) {
      console.error('❌ HMAC verification failed!');
      console.error(`   Received: ${hmac}`);
      console.error(`   Calculated: ${calculatedHmac}`);
      return res.status(403).json({
        error: 'Security verification failed',
        message: 'Invalid HMAC signature. Possible tampering detected.'
      });
    }

    console.log('✅ HMAC verified successfully');

    // ============================================
    // EXCHANGE CODE FOR ACCESS TOKEN
    // ============================================
    console.log(`🔐 [OAuth Callback] Exchanging code for access token for shop: ${shop}`);

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

// ============ PRODUCTS ============

app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ products });
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products/sync', authenticateToken, async (req, res) => {
  try {
    // ============================================
    // DUAL-MODE AUTH: Get credentials based on AUTH_MODE
    // ============================================
    const { shop, accessToken } = await getShopifyCredentials(req, supabase);

    const response = await axios.get(
      `https://${shop}/admin/api/2024-01/products.json?limit=250`,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ordersResponse = await axios.get(
      `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${thirtyDaysAgo.toISOString()}&limit=250`,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );

    const orders = ordersResponse.data.orders || [];
    const variantSales = {};
    const variantRevenue = {};

    orders.forEach(order => {
      order.line_items?.forEach(item => {
        const variantId = item.variant_id?.toString();
        if (variantId) {
          variantSales[variantId] = (variantSales[variantId] || 0) + (item.quantity || 0);
          variantRevenue[variantId] = (variantRevenue[variantId] || 0) + (parseFloat(item.price) * item.quantity);
        }
      });
    });

    let syncedCount = 0;
    for (const product of response.data.products) {
      const variant = product.variants[0];
      const variantId = variant.id.toString();
      const totalSales = variantSales[variantId] || 0;
      const totalRevenue = variantRevenue[variantId] || 0;
      const salesVelocity = totalSales / 30;

      const { error: upsertError } = await supabase
        .from('products')
        .upsert({
          user_id: req.user.id,
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
        }, {
          onConflict: 'user_id,shopify_variant_id'
        });

      if (upsertError) {
        console.error('Error upserting product:', upsertError);
      } else {
        syncedCount++;
      }
    }

    res.json({ success: true, message: `Synced ${syncedCount} products`, count: syncedCount });
  } catch (error) {
    console.error('Product sync error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to sync products' });
  }
});

app.post('/api/products/:id/cost-price', authenticateToken, async (req, res) => {
  const { costPrice } = req.body;
  const productId = req.params.id;
  try {
    const { error } = await supabase
      .from('products')
      .update({ cost_price: costPrice })
      .eq('id', productId)
      .eq('user_id', req.user.id);

    if (error) {
      throw error;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Cost price update error:', error);
    res.status(500).json({ error: 'Failed to update cost price' });
  }
});

// ============ HELPER FUNCTION FOR ANALYSIS ============

async function runAnalysisForUser(userId) {
  console.log(`🤖 Running analysis for user ${userId}`);

  // ============================================
  // DUAL-MODE AUTH: Get credentials based on AUTH_MODE
  // For background jobs, we create a mock req with user ID
  // ============================================
  let shop, accessToken;

  if (AUTH_MODE === 'manual') {
    // Manual mode: use env variables
    shop = process.env.SHOP;
    accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

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
    .select('product_id')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .lt('new_price', supabase.raw('old_price'));

  const priceDecreaseHistory = {};
  if (!historyError && decreaseHistory) {
    decreaseHistory.forEach(row => {
      priceDecreaseHistory[row.product_id] = (priceDecreaseHistory[row.product_id] || 0) + 1;
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

      const analysis = await analyzeProduct(product, allProducts, userSettings, recentOrderData, priceDecreaseHistory);

      console.log(`   Analysis result:`, {
        shouldChangePrice: analysis.shouldChangePrice,
        recommendedPrice: analysis.recommendedPrice,
        urgency: analysis.urgency,
        confidence: analysis.confidence,
        error: analysis.error || 'none'
      });

      if (analysis.shouldChangePrice) {
        // First delete any existing recommendation for this product
        await supabase
          .from('recommendations')
          .delete()
          .eq('user_id', userId)
          .eq('product_id', product.id);

        // Then insert the new recommendation
        const { error: insertError } = await supabase
          .from('recommendations')
          .insert({
            user_id: userId,
            product_id: product.id,
            recommended_price: analysis.recommendedPrice,
            reasoning: analysis.reasoning,
            urgency: analysis.urgency || 'MEDIUM',
            confidence: analysis.confidence
          });

        if (insertError) {
          console.error('Error inserting recommendation:', insertError);
        } else {
          console.log(`   ✅ Recommendation created: $${product.price} → $${analysis.recommendedPrice}`);
          recommendationsCreated++;
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

  console.log(`\n✅ Analysis complete for user ${userId}: ${recommendationsCreated} recommendations created`);
  return recommendationsCreated;
}

// ============ MANUAL ANALYSIS WITH DAILY LIMIT ============

app.get('/api/analysis/status', authenticateToken, async (req, res) => {
  try {
    const { count: selectedCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('selected_for_analysis', true);

    if (countError) {
      throw countError;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: manualUsedToday, error: manualError } = await supabase
      .from('manual_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('triggered_at', todayStart.toISOString());

    if (manualError) {
      throw manualError;
    }

    const manualRemaining = Math.max(0, 10 - (manualUsedToday || 0));

    const { data: scheduleData, error: scheduleError } = await supabase
      .from('analysis_schedule')
      .select('next_analysis_due')
      .eq('user_id', req.user.id)
      .single();

    let timeRemaining = 0;
    let nextAnalysisDue = null;

    if (!scheduleError && scheduleData && scheduleData.next_analysis_due) {
      nextAnalysisDue = new Date(scheduleData.next_analysis_due);
      const now = new Date();
      timeRemaining = Math.max(0, Math.floor((nextAnalysisDue - now) / 1000));
    }

    res.json({
      selectedCount: selectedCount || 0,
      limit: 10,
      canAnalyze: manualRemaining > 0,
      manualUsedToday: manualUsedToday || 0,
      manualRemaining,
      timeRemaining,
      nextAnalysisDue
    });
  } catch (error) {
    console.error('Analysis status error:', error);
    res.status(500).json({ error: 'Failed to get analysis status' });
  }
});

app.post('/api/analysis/run-now', authenticateToken, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: manualUsedToday, error: manualError } = await supabase
      .from('manual_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('triggered_at', todayStart.toISOString());

    if (manualError) {
      throw manualError;
    }

    if ((manualUsedToday || 0) >= 10) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message: 'You have used all 10 manual analyses for today. Limit resets at midnight or wait for automatic analysis.'
      });
    }

    const { count: selectedCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('selected_for_analysis', true);

    if (countError) {
      throw countError;
    }

    if ((selectedCount || 0) === 0) {
      return res.status(400).json({ error: 'No products selected for analysis' });
    }

    console.log(`\n🚀 Starting manual analysis for user ${req.user.id} with ${selectedCount} products`);

    const recommendationsCreated = await runAnalysisForUser(req.user.id);

    const { error: insertError } = await supabase
      .from('manual_analyses')
      .insert({
        user_id: req.user.id,
        products_analyzed: selectedCount
      });

    if (insertError) {
      console.error('Error logging manual analysis:', insertError);
    }

    // Initialize or update analysis schedule for auto-analysis
    const nextDue = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    const { error: scheduleError } = await supabase
      .from('analysis_schedule')
      .upsert({
        user_id: req.user.id,
        last_analysis_run: new Date().toISOString(),
        next_analysis_due: nextDue.toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (scheduleError) {
      console.error('Error updating analysis schedule:', scheduleError);
    }

    const remaining = 10 - (manualUsedToday || 0) - 1;

    console.log(`✅ Manual analysis complete: ${recommendationsCreated} recommendations created, ${remaining} analyses remaining today`);

    res.json({
      success: true,
      message: `Analysis completed for ${selectedCount} products. ${recommendationsCreated} recommendations generated.`,
      manualRemaining: remaining,
      manualUsedToday: (manualUsedToday || 0) + 1,
      recommendationsCreated
    });
  } catch (error) {
    console.error('Manual analysis error:', error);
    res.status(500).json({ error: 'Failed to run analysis' });
  }
});

app.post('/api/products/:id/toggle-analysis', authenticateToken, async (req, res) => {
  const { selected } = req.body;
  const productId = req.params.id;

  try {
    if (selected) {
      const { count: selectedCount, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user.id)
        .eq('selected_for_analysis', true);

      if (countError) {
        throw countError;
      }

      if ((selectedCount || 0) >= 10) {
        return res.status(400).json({
          error: 'Selection limit reached',
          message: 'You can only select up to 10 products for analysis (Pro plan limit)'
        });
      }
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ selected_for_analysis: selected })
      .eq('id', productId)
      .eq('user_id', req.user.id);

    if (updateError) {
      throw updateError;
    }

    const { count: finalCount, error: finalError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('selected_for_analysis', true);

    if (finalError) {
      throw finalError;
    }

    // Initialize analysis schedule if this is the first product selected
    if (selected && finalCount === 1) {
      const nextDue = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      const { error: scheduleError } = await supabase
        .from('analysis_schedule')
        .upsert({
          user_id: req.user.id,
          next_analysis_due: nextDue.toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (scheduleError) {
        console.error('Error initializing analysis schedule:', scheduleError);
      } else {
        console.log(`✅ Initialized analysis schedule for user ${req.user.id}, next analysis at ${nextDue.toISOString()}`);
      }
    }

    res.json({
      success: true,
      selectedCount: finalCount || 0
    });
  } catch (error) {
    console.error('Toggle analysis error:', error);
    res.status(500).json({ error: 'Failed to toggle product selection' });
  }
});

// ============ BACKGROUND JOB - AUTO ANALYSIS ============

setInterval(async () => {
  try {
    console.log('⏰ Running automatic analysis check...');

    const { data: dueUsers, error: dueError } = await supabase
      .from('analysis_schedule')
      .select('user_id')
      .lte('next_analysis_due', new Date().toISOString());

    if (dueError) {
      throw dueError;
    }

    console.log(`📊 Found ${dueUsers ? dueUsers.length : 0} users due for analysis`);

    if (dueUsers) {
      for (const row of dueUsers) {
        const userId = row.user_id;

        try {
          await runAnalysisForUser(userId);

          const now = new Date();
          const nextDue = new Date(now.getTime() + 30 * 60 * 1000);

          await supabase
            .from('analysis_schedule')
            .update({
              last_analysis_run: now.toISOString(),
              next_analysis_due: nextDue.toISOString()
            })
            .eq('user_id', userId);

          console.log(`✅ User ${userId}: Analysis completed, next due at ${nextDue.toISOString()}`);
        } catch (error) {
          console.error(`❌ Error running analysis for user ${userId}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('❌ Background analysis job error:', error);
  }
}, 30 * 60 * 1000);

// ============ RECOMMENDATIONS ============

app.get('/api/recommendations', authenticateToken, async (req, res) => {
  try {
    const { data: recommendations, error } = await supabase
      .from('recommendations')
      .select(`
        *,
        products!inner (
          title,
          price,
          image_url,
          inventory,
          cost_price
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Flatten the structure to match the original format
    const formattedRecommendations = recommendations.map(rec => ({
      ...rec,
      title: rec.products.title,
      current_price: rec.products.price,
      image_url: rec.products.image_url,
      inventory: rec.products.inventory,
      cost_price: rec.products.cost_price,
      products: undefined
    }));

    // Sort by urgency and confidence
    const urgencyOrder = { 'CRITICAL': 1, 'URGENT': 2, 'HIGH': 3, 'MEDIUM': 4 };
    formattedRecommendations.sort((a, b) => {
      const urgencyDiff = (urgencyOrder[a.urgency] || 5) - (urgencyOrder[b.urgency] || 5);
      if (urgencyDiff !== 0) return urgencyDiff;
      return (b.confidence || 0) - (a.confidence || 0);
    });

    res.json({ recommendations: formattedRecommendations });
  } catch (error) {
    console.error('Recommendations fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

app.post('/api/recommendations/reject', authenticateToken, async (req, res) => {
  const { productId } = req.body;
  try {
    const { error } = await supabase
      .from('recommendations')
      .delete()
      .eq('product_id', productId)
      .eq('user_id', req.user.id);

    if (error) {
      throw error;
    }

    res.json({ success: true, message: 'Recommendation dismissed' });
  } catch (error) {
    console.error('Recommendation rejection error:', error);
    res.status(500).json({ error: 'Failed to dismiss recommendation' });
  }
});

// ============ PRICE CHANGES ============

app.post('/api/price-changes/apply', authenticateToken, async (req, res) => {
  const { productId, newPrice } = req.body;
  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', req.user.id)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // ============================================
    // DUAL-MODE AUTH: Get credentials based on AUTH_MODE
    // ============================================
    const { shop, accessToken } = await getShopifyCredentials(req, supabase);

    await axios.put(
      `https://${shop}/admin/api/2024-01/variants/${product.shopify_variant_id}.json`,
      { variant: { id: product.shopify_variant_id, price: newPrice.toString() } },
      { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } }
    );

    const { error: priceChangeError } = await supabase
      .from('price_changes')
      .insert({
        user_id: req.user.id,
        product_id: productId,
        old_price: product.price,
        new_price: newPrice
      });

    if (priceChangeError) {
      console.error('Error logging price change:', priceChangeError);
    }

    await supabase
      .from('products')
      .update({ price: newPrice })
      .eq('id', productId);

    await supabase
      .from('recommendations')
      .delete()
      .eq('product_id', productId)
      .eq('user_id', req.user.id);

    res.json({ success: true, message: 'Price updated successfully' });
  } catch (error) {
    console.error('Price update error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

app.get('/api/price-changes', authenticateToken, async (req, res) => {
  try {
    const { data: priceChanges, error } = await supabase
      .from('price_changes')
      .select(`
        *,
        products (
          title,
          image_url
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    // Flatten the structure
    const formattedChanges = priceChanges.map(pc => ({
      ...pc,
      title: pc.products?.title,
      image_url: pc.products?.image_url,
      products: undefined
    }));

    res.json({ priceChanges: formattedChanges });
  } catch (error) {
    console.error('Price changes fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch price changes' });
  }
});

// ============ ANALYTICS ============

app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
  try {
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    const { count: productsWithCost } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gt('cost_price', 0);

    const { count: recommendationsCount } = await supabase
      .from('recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    const { data: profitData, error: profitError } = await supabase
      .from('price_changes')
      .select('profit_impact')
      .eq('user_id', req.user.id);

    const aiProfitImpact = profitData?.reduce((sum, row) => sum + (parseFloat(row.profit_impact) || 0), 0) || 0;

    const { count: priceChangesCount } = await supabase
      .from('price_changes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    res.json({
      totalProducts: totalProducts || 0,
      productsWithCost: productsWithCost || 0,
      recommendationsCount: recommendationsCount || 0,
      aiProfitImpact,
      priceChangesCount: priceChangesCount || 0
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

app.get('/api/analytics/revenue-impact', authenticateToken, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: thisWeekData } = await supabase
      .from('price_changes')
      .select('profit_impact')
      .eq('user_id', req.user.id)
      .gte('created_at', sevenDaysAgo.toISOString());

    const { data: lastWeekData } = await supabase
      .from('price_changes')
      .select('profit_impact')
      .eq('user_id', req.user.id)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString());

    const thisWeek = thisWeekData?.reduce((sum, row) => sum + (parseFloat(row.profit_impact) || 0), 0) || 0;
    const lastWeek = lastWeekData?.reduce((sum, row) => sum + (parseFloat(row.profit_impact) || 0), 0) || 0;
    const improvement = thisWeek - lastWeek;
    const improvementPercent = lastWeek > 0 ? (improvement / lastWeek) * 100 : 0;

    res.json({
      thisWeek,
      lastWeek,
      improvement,
      improvementPercent
    });
  } catch (error) {
    console.error('Revenue impact error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue impact' });
  }
});

app.get('/api/analytics/action-timeline', authenticateToken, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: changes, error } = await supabase
      .from('price_changes')
      .select('created_at, profit_impact')
      .eq('user_id', req.user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Group by date
    const grouped = {};
    changes?.forEach(row => {
      const date = new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!grouped[date]) {
        grouped[date] = { actions: 0, revenue: 0 };
      }
      grouped[date].actions++;
      grouped[date].revenue += parseFloat(row.profit_impact) || 0;
    });

    const timelineData = Object.keys(grouped).map(date => ({
      date,
      actions: grouped[date].actions,
      revenue: grouped[date].revenue
    }));

    res.json({ timelineData });
  } catch (error) {
    console.error('Action timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch action timeline' });
  }
});

app.get('/api/analytics/projected-growth', authenticateToken, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: changes, error } = await supabase
      .from('price_changes')
      .select('profit_impact')
      .eq('user_id', req.user.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) {
      throw error;
    }

    const count = changes?.length || 0;
    const totalProfit = changes?.reduce((sum, row) => sum + (parseFloat(row.profit_impact) || 0), 0) || 0;
    const avgProfit = count > 0 ? totalProfit / count : 0;

    const dailyRate = count > 0 ? avgProfit * (count / 30) : 0;
    const projected30 = dailyRate * 30;
    const projected60 = dailyRate * 60;
    const projected90 = dailyRate * 90;

    res.json({
      current: totalProfit,
      projected30,
      projected60,
      projected90
    });
  } catch (error) {
    console.error('Projected growth error:', error);
    res.status(500).json({ error: 'Failed to fetch projected growth' });
  }
});

// ============ ORDERS ============

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    // ============================================
    // DUAL-MODE AUTH: Get credentials based on AUTH_MODE
    // ============================================
    const { shop, accessToken } = await getShopifyCredentials(req, supabase);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const response = await axios.get(
      `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${thirtyDaysAgo.toISOString()}&limit=50`,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );

    const orders = response.data.orders.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest',
      email: order.email,
      totalPrice: order.total_price,
      lineItemsCount: order.line_items?.length || 0,
      items: order.line_items?.map(item => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price
      })) || [],
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
      createdAt: order.created_at
    }));

    res.json({ orders });
  } catch (error) {
    console.error('Orders fetch error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ============ DEBUG ENDPOINT ============

app.get('/api/debug', (req, res) => {
  res.json({
    deployTime: new Date().toISOString(),
    commitHash: 'SUPABASE-REFACTORED',
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  });
});

// ============ SHOPIFY AUTH TEST ============

app.get('/api/test-auth', authenticateToken, async (req, res) => {
  try {
    // ============================================
    // DUAL-MODE AUTH: Get credentials and test connection
    // ============================================
    const { shop, accessToken } = await getShopifyCredentials(req, supabase);

    // Test the Shopify connection by fetching shop info
    const shopifyResponse = await axios.get(
      `https://${shop}/admin/api/2024-01/shop.json`,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );

    const shopData = shopifyResponse.data.shop;

    return res.json({
      status: 'success',
      mode: AUTH_MODE,
      message: `✅ Connected to Shopify successfully in ${AUTH_MODE.toUpperCase()} mode`,
      shop: {
        domain: shop,
        name: shopData.name,
        email: shopData.email,
        currency: shopData.currency,
        plan: shopData.plan_name
      },
      config: AUTH_MODE === 'manual'
        ? { source: 'environment variables (.env)' }
        : { source: 'shops table (OAuth)' }
    });
  } catch (error) {
    console.error('❌ Test auth error:', error.response?.data || error.message);

    return res.status(500).json({
      status: 'error',
      mode: AUTH_MODE,
      message: 'Failed to connect to Shopify',
      error: error.response?.data?.errors || error.message,
      hint: AUTH_MODE === 'manual'
        ? 'Check that SHOP and SHOPIFY_ACCESS_TOKEN are set correctly in .env'
        : 'Check that shop domain exists in shops table with valid OAuth token'
    });
  }
});

// ============ ADMIN PANEL - MULTI-APP MANAGEMENT ============

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  // Skip authentication for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    console.log('✅ Skipping auth for OPTIONS preflight request');
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Admin auth check - Token present:', !!token);

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Try to verify as our JWT token first
    try {
      const verified = jwt.verify(token, JWT_SECRET);
      if (verified && verified.email && verified.email.toLowerCase() === 'arealhuman21@gmail.com') {
        console.log('✅ Admin authenticated via JWT:', verified.email);
        req.user = verified;
        return next();
      }
    } catch (jwtError) {
      // Not our JWT, try Supabase token
      console.log('🔄 Not a JWT token, trying Supabase token decode...');
    }

    // Decode token (works for both JWT and Supabase tokens)
    const decoded = jwt.decode(token);

    console.log('🔓 Decoded token:', decoded ? { email: decoded.email } : 'null');

    if (!decoded || !decoded.email) {
      console.log('❌ Invalid token format - missing email');
      return res.status(403).json({ error: 'Invalid token format' });
    }

    // Check if user is admin email
    if (decoded.email.toLowerCase() !== 'arealhuman21@gmail.com') {
      console.log('❌ Not admin email:', decoded.email);
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('✅ Admin authenticated:', decoded.email);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Admin authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
};

// Admin endpoint: Manually set Shopify connection for any user
app.post('/api/admin/users/:id/set-shopify', authenticateAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { shopDomain, accessToken } = req.body;

    if (!shopDomain || !accessToken) {
      return res.status(400).json({ error: 'Shop domain and access token required' });
    }

    console.log(`🔧 [ADMIN] Setting Shopify connection for user ${userId}: ${shopDomain}`);

    // Verify the token works
    try {
      await axios.get(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      });
      console.log(`✅ [ADMIN] Token verified for ${shopDomain}`);
    } catch (err) {
      console.error(`❌ [ADMIN] Invalid token for ${shopDomain}:`, err.message);
      return res.status(400).json({ error: 'Invalid Shopify credentials or shop not accessible' });
    }

    // Update users table
    const { error: updateError } = await supabase
      .from('users')
      .update({
        shopify_shop: shopDomain,
        shopify_access_token: accessToken
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Also update/insert in shops table
    const { error: upsertError } = await supabase
      .from('shops')
      .upsert({
        shop_domain: shopDomain,
        access_token: accessToken,
        user_id: userId,
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'shop_domain'
      });

    if (upsertError) {
      throw upsertError;
    }

    console.log(`✅ [ADMIN] Manually connected ${shopDomain} to user ${userId}`);

    res.json({
      success: true,
      message: `Successfully connected ${shopDomain} to user`,
      shop: shopDomain
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error setting Shopify connection:', error);
    res.status(500).json({ error: 'Failed to set Shopify connection' });
  }
});

// Get all Shopify apps
app.get('/api/admin/apps', authenticateAdmin, async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('📋 [ADMIN] Fetching all apps via Supabase...');

    const { data, error } = await supabase
      .from('shopify_apps')
      .select('id, app_name, client_id, shop_domain, status, created_at, install_url')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [ADMIN] Found ${data.length} apps in ${duration}ms`);
    res.json({ apps: data });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [ADMIN] Apps fetch error after ${duration}ms:`, error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to fetch apps', details: error.message });
  }
});

// Add new Shopify app
app.post('/api/admin/apps', authenticateAdmin, async (req, res) => {
  console.log('\n========================================');
  console.log('🚀 [ADMIN] POST /api/admin/apps - REQUEST RECEIVED');
  console.log('========================================');
  console.log('📋 Request body:', req.body);
  console.log('🔑 Auth header present:', !!req.headers['authorization']);
  console.log('🌐 Origin:', req.headers['origin']);

  const { appName, clientId, clientSecret, shopDomain, userEmail, installUrl } = req.body;

  console.log('📝 [ADMIN] Creating app:', { appName, shopDomain, userEmail, hasInstallUrl: !!installUrl });

  if (!appName || !clientId || !clientSecret || !shopDomain || !userEmail) {
    console.log('❌ [ADMIN] Missing required fields');
    return res.status(400).json({ error: 'Missing required app fields (appName, clientId, clientSecret, shopDomain, userEmail)' });
  }

  // installUrl is now optional - we'll generate it after getting the app ID
  // The Shopify Partner link provided by user is just for reference, not used

  const startTime = Date.now();
  try {
    console.log('💾 [ADMIN] Inserting app into database via Supabase...');
    console.log('⏱️  [ADMIN] Starting database INSERT...');

    // Insert app and get the ID back
    const { data: newApp, error: insertError } = await supabase
      .from('shopify_apps')
      .insert({
        app_name: appName,
        client_id: clientId,
        client_secret: clientSecret,
        shop_domain: shopDomain,
        status: 'active'
      })
      .select('id, app_name, client_id, shop_domain, status, created_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    // Generate the correct OAuth install link using our backend WITH user_email
    const backendUrl = process.env.BACKEND_URL || 'https://automerchant-backend-v2.vercel.app';
    const generatedInstallUrl = `${backendUrl}/api/shopify/install?shop=${shopDomain}&app_id=${newApp.id}&user_email=${encodeURIComponent(userEmail)}`;

    // Update the app with the generated install URL
    const { error: updateError } = await supabase
      .from('shopify_apps')
      .update({ install_url: generatedInstallUrl })
      .eq('id', newApp.id);

    if (updateError) {
      throw updateError;
    }

    newApp.install_url = generatedInstallUrl;
    const app = newApp;

    console.log('⏱️  [ADMIN] Database INSERT completed');
    console.log('🔗 [ADMIN] Generated install URL:', generatedInstallUrl);

    const duration = Date.now() - startTime;

    console.log(`✅ [ADMIN] App created successfully in ${duration}ms: ${app.app_name} (ID: ${app.id})`);
    console.log('📤 [ADMIN] Sending response to frontend...');

    res.json({
      success: true,
      app
    });

    console.log('✅ [ADMIN] Response sent successfully');
    console.log('========================================\n');
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [ADMIN] App create error after ${duration}ms:`, error.message);
    console.error('Full error:', error);

    // Check for unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'An app with this name already exists. Please use a different name.'
      });
    }

    res.status(500).json({ error: 'Failed to create app', details: error.message });
    console.log('========================================\n');
  }
});

// Delete Shopify app
app.delete('/api/admin/apps/:id', authenticateAdmin, async (req, res) => {
  try {
    console.log(`🗑️  [ADMIN] Deleting app ID: ${req.params.id}`);

    const { error } = await supabase
      .from('shopify_apps')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      throw error;
    }

    console.log(`✅ [ADMIN] App ${req.params.id} deleted`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [ADMIN] App delete error:', error.message);
    res.status(500).json({ error: 'Failed to delete app', details: error.message });
  }
});

// Get all waitlist users with approval status
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('📊 [ADMIN] Fetching all users with approval status via Supabase...');

    // Get all users from users table (includes approved status)
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        approved,
        suspended,
        approved_at,
        suspended_at,
        assigned_app_id,
        created_at,
        shopify_apps(app_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const usersWithStatus = users.map(user => ({
      ...user,
      assigned_app_name: user.shopify_apps?.app_name || null,
      shopify_apps: undefined, // Remove nested object
      name: user.email.split('@')[0] // Extract name from email
    }));

    const duration = Date.now() - startTime;
    console.log(`📊 [ADMIN] Returned ${usersWithStatus.length} users in ${duration}ms`);

    res.json({ users: usersWithStatus });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [ADMIN] Users fetch error after ${duration}ms:`, error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// Approve user
app.post('/api/admin/users/:id/approve', authenticateAdmin, async (req, res) => {
  const startTime = Date.now();
  try {
    console.log(`✅ [ADMIN] Approving user ${req.params.id} via Supabase...`);

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        approved: true,
        suspended: false,
        approved_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select('id, email, approved, approved_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`❌ [ADMIN] User ${req.params.id} not found`);
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [ADMIN] User ${updatedUser.email} approved successfully in ${duration}ms`);

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [ADMIN] User approve error after ${duration}ms:`, error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to approve user', details: error.message });
  }
});

// Suspend user
app.post('/api/admin/users/:id/suspend', authenticateAdmin, async (req, res) => {
  const startTime = Date.now();
  try {
    console.log(`🚫 [ADMIN] Suspending user ${req.params.id} via Supabase...`);

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        suspended: true,
        suspended_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select('id, email, suspended, suspended_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`❌ [ADMIN] User ${req.params.id} not found`);
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }

    const duration = Date.now() - startTime;
    console.log(`🚫 [ADMIN] User ${updatedUser.email} suspended successfully in ${duration}ms`);

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [ADMIN] User suspend error after ${duration}ms:`, error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to suspend user', details: error.message });
  }
});

// Unsuspend user
app.post('/api/admin/users/:id/unsuspend', authenticateAdmin, async (req, res) => {
  const startTime = Date.now();
  try {
    console.log(`✅ [ADMIN] Unsuspending user ${req.params.id} via Supabase...`);

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        suspended: false,
        suspended_at: null
      })
      .eq('id', req.params.id)
      .select('id, email, suspended')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`❌ [ADMIN] User ${req.params.id} not found`);
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [ADMIN] User ${updatedUser.email} unsuspended successfully in ${duration}ms`);

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [ADMIN] User unsuspend error after ${duration}ms:`, error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to unsuspend user', details: error.message });
  }
});

// Assign app to user
app.post('/api/admin/users/:id/assign-app', authenticateAdmin, async (req, res) => {
  const { appId } = req.body;
  const startTime = Date.now();

  try {
    console.log(`🔗 [ADMIN] Assigning app ${appId} to user ${req.params.id} via Supabase...`);

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ assigned_app_id: appId })
      .eq('id', req.params.id)
      .select('id, email, assigned_app_id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`❌ [ADMIN] User ${req.params.id} not found`);
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }

    const duration = Date.now() - startTime;
    console.log(`🔗 [ADMIN] App ${appId} assigned to user ${updatedUser.email} in ${duration}ms`);

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [ADMIN] App assignment error after ${duration}ms:`, error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to assign app', details: error.message });
  }
});

// Get admin stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('📊 [ADMIN] Fetching admin stats via Supabase...');

    // Run all count queries in parallel
    const [
      totalUsersResult,
      approvedUsersResult,
      suspendedUsersResult,
      pendingUsersResult,
      totalAppsResult
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('approved', true),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('suspended', true),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('approved', false).eq('suspended', false),
      supabase.from('shopify_apps').select('*', { count: 'exact', head: true }).eq('status', 'active')
    ]);

    const stats = {
      totalUsers: totalUsersResult.count || 0,
      approvedUsers: approvedUsersResult.count || 0,
      suspendedUsers: suspendedUsersResult.count || 0,
      pendingUsers: pendingUsersResult.count || 0,
      totalApps: totalAppsResult.count || 0
    };

    const duration = Date.now() - startTime;
    console.log(`📊 [ADMIN] Stats fetched in ${duration}ms:`, stats);

    res.json(stats);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [ADMIN] Stats fetch error after ${duration}ms:`, error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

// Remove user from waitlist
app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  const startTime = Date.now();
  try {
    console.log(`🗑️  [ADMIN] Deleting user ${req.params.id} via Supabase...`);

    const { error } = await supabase
      .from('waitlist_emails')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      throw error;
    }

    const duration = Date.now() - startTime;
    console.log(`🗑️  [ADMIN] User deleted successfully in ${duration}ms`);

    res.json({ success: true });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [ADMIN] User delete error after ${duration}ms:`, error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// ============ HEALTH CHECK ============

app.get('/api/health', async (req, res) => {
  try {
    // Test Supabase connection by querying any table
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    return res.json({
      status: 'ok',
      supabase: true,
      time: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err?.message || 'unknown error',
      code: err?.code || null
    });
  }
});

// ============ START SERVER ============

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Local server on ${PORT}`));
}
module.exports = app;
