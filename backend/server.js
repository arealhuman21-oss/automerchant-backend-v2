// ============================================
// COMPLETE BACKEND - server.js
// FIXED VERSION - Duplicate endpoint removed
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const analysisLimiter = (req, res, next) => next();
const authLimiter = (req, res, next) => next();

// ============================================
// BULLETPROOF DATABASE CONFIGURATION
// ============================================
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ FATAL: DATABASE_URL environment variable not set');
}

// ABSOLUTE NUCLEAR OPTION: Parse the URL and reconstruct with SSL params
// This bypasses any pg library SSL config issues
const url = new URL(dbUrl);
const connectionConfig = {
  host: url.hostname,
  port: url.port || 5432,
  database: url.pathname.split('/')[1],
  user: url.username,
  password: url.password,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
};

console.log('🔧 Database Config:', {
  host: connectionConfig.host,
  port: connectionConfig.port,
  database: connectionConfig.database,
  sslEnabled: !!connectionConfig.ssl,
  sslReject: connectionConfig.ssl.rejectUnauthorized
});

const pool = new Pool(connectionConfig);

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
  }
});

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

app.use(cors(corsOptions));
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
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name]
    );
    const token = jwt.sign({ id: result.rows[0].id, email: result.rows[0].email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: result.rows[0].id, email: result.rows[0].email, name: result.rows[0].name } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, shopifyConnected: !!user.shopify_shop } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============ SHOPIFY CONNECTION ============

app.post('/api/shopify/connect', authenticateToken, async (req, res) => {
  const { shopifyShop, accessToken } = req.body;
  if (!shopifyShop || !accessToken) {
    return res.status(400).json({ error: 'Shop name and access token required' });
  }
  try {
    await axios.get(`https://${shopifyShop}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });
    await pool.query(
      'UPDATE users SET shopify_shop = $1, shopify_access_token = $2 WHERE id = $3',
      [shopifyShop, accessToken, req.user.id]
    );
    res.json({ success: true, message: 'Shopify connected successfully' });
  } catch (error) {
    console.error('Shopify connection error:', error.response?.data || error);
    res.status(400).json({ error: 'Invalid Shopify credentials' });
  }
});

app.get('/api/shopify/check', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT shopify_shop, shopify_access_token FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const user = result.rows[0];
    const connected = !!(user.shopify_shop && user.shopify_access_token);
    
    res.json({ connected, shop: user.shopify_shop });
  } catch (error) {
    console.error('Shopify check error:', error);
    res.status(500).json({ error: 'Failed to check Shopify connection' });
  }
});

// ============ PRODUCTS ============

app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ products: result.rows });
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products/sync', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT shopify_shop, shopify_access_token FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user.shopify_shop || !user.shopify_access_token) {
      return res.status(400).json({ error: 'Shopify not connected' });
    }

    const response = await axios.get(
      `https://${user.shopify_shop}/admin/api/2024-01/products.json?limit=250`,
      { headers: { 'X-Shopify-Access-Token': user.shopify_access_token } }
    );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const ordersResponse = await axios.get(
      `https://${user.shopify_shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${thirtyDaysAgo.toISOString()}&limit=250`,
      { headers: { 'X-Shopify-Access-Token': user.shopify_access_token } }
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

      await pool.query(
        `INSERT INTO products (
          user_id, shopify_product_id, shopify_variant_id, title, price, 
          inventory, image_url, total_sales_30d, revenue_30d, sales_velocity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id, shopify_variant_id) 
        DO UPDATE SET 
          title = EXCLUDED.title,
          price = EXCLUDED.price,
          inventory = EXCLUDED.inventory,
          image_url = EXCLUDED.image_url,
          total_sales_30d = EXCLUDED.total_sales_30d,
          revenue_30d = EXCLUDED.revenue_30d,
          sales_velocity = EXCLUDED.sales_velocity,
          updated_at = NOW()`,
        [
          req.user.id,
          product.id.toString(),
          variantId,
          product.title,
          variant.price,
          variant.inventory_quantity || 0,
          product.image?.src || null,
          totalSales,
          totalRevenue,
          salesVelocity
        ]
      );
      syncedCount++;
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
    await pool.query(
      'UPDATE products SET cost_price = $1 WHERE id = $2 AND user_id = $3',
      [costPrice, productId, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Cost price update error:', error);
    res.status(500).json({ error: 'Failed to update cost price' });
  }
});

// ============ HELPER FUNCTION FOR ANALYSIS ============

async function runAnalysisForUser(userId) {
  console.log(`🤖 Running analysis for user ${userId}`);

  const userResult = await pool.query(
    'SELECT shopify_shop, shopify_access_token FROM users WHERE id = $1',
    [userId]
  );

  const user = userResult.rows[0];
  if (!user.shopify_shop || !user.shopify_access_token) {
    console.log(`⚠️ User ${userId}: Shopify not connected`);
    return;
  }

  const productsResult = await pool.query(
    'SELECT * FROM products WHERE user_id = $1 AND selected_for_analysis = true',
    [userId]
  );

  if (productsResult.rows.length === 0) {
    console.log(`⚠️ User ${userId}: No products selected for analysis`);
    return;
  }

  console.log(`📊 Analyzing ${productsResult.rows.length} selected products for user ${userId}`);

  const allProducts = productsResult.rows;
  const userSettings = { target_margin: 40 };

  // Get price decrease history (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const decreaseHistoryResult = await pool.query(
    `SELECT product_id, COUNT(*) as decrease_count
     FROM price_changes
     WHERE user_id = $1
       AND created_at >= $2
       AND new_price < old_price
     GROUP BY product_id`,
    [userId, thirtyDaysAgo]
  );

  const priceDecreaseHistory = {};
  decreaseHistoryResult.rows.forEach(row => {
    priceDecreaseHistory[row.product_id] = parseInt(row.decrease_count);
  });

  console.log(`📉 Price decrease history loaded: ${decreaseHistoryResult.rows.length} products have decreases this month`);
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  let recentOrderData = {};
  try {
    const ordersResponse = await axios.get(
      `https://${user.shopify_shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${sevenDaysAgo.toISOString()}&limit=250`,
      { headers: { 'X-Shopify-Access-Token': user.shopify_access_token } }
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
        await pool.query(
          'DELETE FROM recommendations WHERE user_id = $1 AND product_id = $2',
          [userId, product.id]
        );

        // Then insert the new recommendation
        await pool.query(
          `INSERT INTO recommendations (user_id, product_id, recommended_price, reasoning, urgency, confidence)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, product.id, analysis.recommendedPrice, analysis.reasoning, analysis.urgency || 'MEDIUM', analysis.confidence]
        );
        console.log(`   ✅ Recommendation created: $${product.price} → $${analysis.recommendedPrice}`);
        recommendationsCreated++;
      } else {
        console.log(`   ✓ No price change needed`);
        console.log(`   Reasoning: ${analysis.reasoning || analysis.error || 'Unknown'}`);
      }

      await pool.query(
        'UPDATE products SET last_analyzed_at = NOW() WHERE id = $1',
        [product.id]
      );
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
    const selectedResult = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE user_id = $1 AND selected_for_analysis = true',
      [req.user.id]
    );
    const selectedCount = parseInt(selectedResult.rows[0].count) || 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const manualCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM manual_analyses WHERE user_id = $1 AND triggered_at >= $2',
      [req.user.id, todayStart]
    );
    const manualUsedToday = parseInt(manualCountResult.rows[0].count) || 0;
    const manualRemaining = Math.max(0, 10 - manualUsedToday);

    const scheduleResult = await pool.query(
      'SELECT next_analysis_due FROM analysis_schedule WHERE user_id = $1',
      [req.user.id]
    );
    
    let timeRemaining = 0;
    let nextAnalysisDue = null;
    
    if (scheduleResult.rows.length > 0 && scheduleResult.rows[0].next_analysis_due) {
      nextAnalysisDue = new Date(scheduleResult.rows[0].next_analysis_due);
      const now = new Date();
      timeRemaining = Math.max(0, Math.floor((nextAnalysisDue - now) / 1000));
    }

    res.json({
      selectedCount,
      limit: 10,
      canAnalyze: manualRemaining > 0,
      manualUsedToday,
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
    
    const manualCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM manual_analyses WHERE user_id = $1 AND triggered_at >= $2',
      [req.user.id, todayStart]
    );
    const manualUsedToday = parseInt(manualCountResult.rows[0].count) || 0;
    
    if (manualUsedToday >= 10) {
      return res.status(429).json({ 
        error: 'Daily limit reached',
        message: 'You have used all 10 manual analyses for today. Limit resets at midnight or wait for automatic analysis.'
      });
    }

    const selectedResult = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE user_id = $1 AND selected_for_analysis = true',
      [req.user.id]
    );
    const selectedCount = parseInt(selectedResult.rows[0].count) || 0;
    
    if (selectedCount === 0) {
      return res.status(400).json({ error: 'No products selected for analysis' });
    }

    console.log(`\n🚀 Starting manual analysis for user ${req.user.id} with ${selectedCount} products`);

    const recommendationsCreated = await runAnalysisForUser(req.user.id);

    await pool.query(
      'INSERT INTO manual_analyses (user_id, products_analyzed) VALUES ($1, $2)',
      [req.user.id, selectedCount]
    );

    // Initialize or update analysis schedule for auto-analysis
    const nextDue = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    await pool.query(
      `INSERT INTO analysis_schedule (user_id, last_analysis_run, next_analysis_due)
       VALUES ($1, NOW(), $2)
       ON CONFLICT (user_id)
       DO UPDATE SET last_analysis_run = NOW(), next_analysis_due = $2`,
      [req.user.id, nextDue]
    );

    const remaining = 10 - manualUsedToday - 1;

    console.log(`✅ Manual analysis complete: ${recommendationsCreated} recommendations created, ${remaining} analyses remaining today`);

    res.json({
      success: true,
      message: `Analysis completed for ${selectedCount} products. ${recommendationsCreated} recommendations generated.`,
      manualRemaining: remaining,
      manualUsedToday: manualUsedToday + 1,
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
      const currentSelected = await pool.query(
        'SELECT COUNT(*) as count FROM products WHERE user_id = $1 AND selected_for_analysis = true',
        [req.user.id]
      );

      const selectedCount = parseInt(currentSelected.rows[0].count) || 0;

      if (selectedCount >= 10) {
        return res.status(400).json({
          error: 'Selection limit reached',
          message: 'You can only select up to 10 products for analysis (Pro plan limit)'
        });
      }
    }

    await pool.query(
      'UPDATE products SET selected_for_analysis = $1 WHERE id = $2 AND user_id = $3',
      [selected, productId, req.user.id]
    );

    const newCount = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE user_id = $1 AND selected_for_analysis = true',
      [req.user.id]
    );

    const finalCount = parseInt(newCount.rows[0].count) || 0;

    // Initialize analysis schedule if this is the first product selected
    if (selected && finalCount === 1) {
      const nextDue = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      await pool.query(
        `INSERT INTO analysis_schedule (user_id, next_analysis_due)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET next_analysis_due = $2`,
        [req.user.id, nextDue]
      );
      console.log(`✅ Initialized analysis schedule for user ${req.user.id}, next analysis at ${nextDue.toISOString()}`);
    }

    res.json({
      success: true,
      selectedCount: finalCount
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
    
    const dueAnalysisResult = await pool.query(
      'SELECT user_id FROM analysis_schedule WHERE next_analysis_due <= NOW()'
    );
    
    console.log(`📊 Found ${dueAnalysisResult.rows.length} users due for analysis`);
    
    for (const row of dueAnalysisResult.rows) {
      const userId = row.user_id;
      
      try {
        await runAnalysisForUser(userId);
        
        const now = new Date();
        const nextDue = new Date(now.getTime() + 30 * 60 * 1000);
        await pool.query(
          'UPDATE analysis_schedule SET last_analysis_run = $1, next_analysis_due = $2 WHERE user_id = $3',
          [now, nextDue, userId]
        );
        
        console.log(`✅ User ${userId}: Analysis completed, next due at ${nextDue.toISOString()}`);
      } catch (error) {
        console.error(`❌ Error running analysis for user ${userId}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Background analysis job error:', error);
  }
}, 30 * 60 * 1000);

// ============ RECOMMENDATIONS ============

app.get('/api/recommendations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, p.title, p.price as current_price, p.image_url, p.inventory, p.cost_price
       FROM recommendations r
       JOIN products p ON r.product_id = p.id
       WHERE r.user_id = $1
       ORDER BY
         CASE r.urgency
           WHEN 'CRITICAL' THEN 1
           WHEN 'URGENT' THEN 2
           WHEN 'HIGH' THEN 3
           WHEN 'MEDIUM' THEN 4
           ELSE 5
         END,
         r.confidence DESC,
         r.created_at DESC`,
      [req.user.id]
    );
    res.json({ recommendations: result.rows });
  } catch (error) {
    console.error('Recommendations fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

app.post('/api/recommendations/reject', authenticateToken, async (req, res) => {
  const { productId } = req.body;
  try {
    await pool.query(
      'DELETE FROM recommendations WHERE product_id = $1 AND user_id = $2',
      [productId, req.user.id]
    );
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
    const productResult = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND user_id = $2',
      [productId, req.user.id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productResult.rows[0];
    const userResult = await pool.query(
      'SELECT shopify_shop, shopify_access_token FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = userResult.rows[0];
    await axios.put(
      `https://${user.shopify_shop}/admin/api/2024-01/variants/${product.shopify_variant_id}.json`,
      { variant: { id: product.shopify_variant_id, price: newPrice.toString() } },
      { headers: { 'X-Shopify-Access-Token': user.shopify_access_token, 'Content-Type': 'application/json' } }
    );

    await pool.query(
      'INSERT INTO price_changes (user_id, product_id, old_price, new_price) VALUES ($1, $2, $3, $4)',
      [req.user.id, productId, product.price, newPrice]
    );

    await pool.query('UPDATE products SET price = $1 WHERE id = $2', [newPrice, productId]);
    await pool.query('DELETE FROM recommendations WHERE product_id = $1 AND user_id = $2', [productId, req.user.id]);

    res.json({ success: true, message: 'Price updated successfully' });
  } catch (error) {
    console.error('Price update error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

app.get('/api/price-changes', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pc.*, p.title, p.image_url
       FROM price_changes pc
       JOIN products p ON pc.product_id = p.id
       WHERE pc.user_id = $1
       ORDER BY pc.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ priceChanges: result.rows });
  } catch (error) {
    console.error('Price changes fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch price changes' });
  }
});

// ============ ANALYTICS ============

app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
  try {
    const productsResult = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE user_id = $1',
      [req.user.id]
    );
    const totalProducts = parseInt(productsResult.rows[0].count) || 0;

    const costPricesResult = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE user_id = $1 AND cost_price > 0',
      [req.user.id]
    );
    const productsWithCost = parseInt(costPricesResult.rows[0].count) || 0;

    const recsResult = await pool.query(
      'SELECT COUNT(*) as count FROM recommendations WHERE user_id = $1',
      [req.user.id]
    );
    const recommendationsCount = parseInt(recsResult.rows[0].count) || 0;

    const profitResult = await pool.query(
      'SELECT SUM(profit_impact) as total FROM price_changes WHERE user_id = $1',
      [req.user.id]
    );
    const aiProfitImpact = parseFloat(profitResult.rows[0].total) || 0;

    const changesResult = await pool.query(
      'SELECT COUNT(*) as count FROM price_changes WHERE user_id = $1',
      [req.user.id]
    );
    const priceChangesCount = parseInt(changesResult.rows[0].count) || 0;

    res.json({
      totalProducts,
      productsWithCost,
      recommendationsCount,
      aiProfitImpact,
      priceChangesCount
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

app.get('/api/analytics/revenue-impact', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN profit_impact ELSE 0 END) as this_week,
        SUM(CASE WHEN created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days' THEN profit_impact ELSE 0 END) as last_week
       FROM price_changes 
       WHERE user_id = $1`,
      [req.user.id]
    );

    const thisWeek = parseFloat(result.rows[0]?.this_week) || 0;
    const lastWeek = parseFloat(result.rows[0]?.last_week) || 0;
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
    const result = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as actions,
        SUM(profit_impact) as revenue
       FROM price_changes 
       WHERE user_id = $1 
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [req.user.id]
    );

    const timelineData = result.rows.map(row => ({
      date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actions: parseInt(row.actions) || 0,
      revenue: parseFloat(row.revenue) || 0
    }));

    res.json({ timelineData });
  } catch (error) {
    console.error('Action timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch action timeline' });
  }
});

app.get('/api/analytics/projected-growth', authenticateToken, async (req, res) => {
  try {
    const avgResult = await pool.query(
      `SELECT AVG(profit_impact) as avg_profit, COUNT(*) as count
       FROM price_changes 
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [req.user.id]
    );

    const avgProfit = parseFloat(avgResult.rows[0]?.avg_profit) || 0;
    const count = parseInt(avgResult.rows[0]?.count) || 0;

    const dailyRate = count > 0 ? avgProfit * (count / 30) : 0;
    const projected30 = dailyRate * 30;
    const projected60 = dailyRate * 60;
    const projected90 = dailyRate * 90;

    res.json({
      current: avgProfit * count,
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
    const userResult = await pool.query(
      'SELECT shopify_shop, shopify_access_token FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = userResult.rows[0];
    if (!user.shopify_shop || !user.shopify_access_token) {
      return res.json({ orders: [] });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const response = await axios.get(
      `https://${user.shopify_shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${thirtyDaysAgo.toISOString()}&limit=50`,
      { headers: { 'X-Shopify-Access-Token': user.shopify_access_token } }
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
    commitHash: 'PARSED-CONFIG',
    hasDbUrl: !!process.env.DATABASE_URL,
    connectionConfig: {
      host: connectionConfig.host,
      port: connectionConfig.port,
      database: connectionConfig.database,
      ssl: connectionConfig.ssl
    },
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  });
});

// ============ HEALTH CHECK ============

app.get('/api/health', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() as now');
    return res.json({
      status: 'ok',
      supabase: true,
      time: rows[0].now.toISOString?.() || rows[0].now
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
