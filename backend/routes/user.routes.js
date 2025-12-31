const express = require('express');
const router = express.Router();
const axios = require('axios');
const { supabaseService } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { JWT_SECRET } = require('../config/environment');
const jwt = require('jsonwebtoken');

// Helper function to get Shopify credentials
async function getShopifyCredentials(req) {
  const AUTH_MODE = process.env.AUTH_MODE || 'oauth';

  if (AUTH_MODE === 'manual') {
    const shop = process.env.SHOP;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    if (!shop || !accessToken) {
      throw new Error('SHOP and SHOPIFY_ACCESS_TOKEN must be set in environment for manual mode');
    }
    return { shop, accessToken };
  } else {
    const userId = req.user.userId;
    const { data: shopData, error: shopError } = await supabaseService
      .from('shops')
      .select('shop_domain, access_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (shopError || !shopData) {
      throw new Error('No active Shopify connection found. Please reconnect your store.');
    }
    return { shop: shopData.shop_domain, accessToken: shopData.access_token };
  }
}

// POST /api/check-approval - Check if user is approved (legacy endpoint)
router.post('/check-approval', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

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
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
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

// GET /api/shopify/status - Check if user has Shopify connected
router.get('/shopify/status', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabaseService
      .from('users')
      .select('shopify_shop')
      .eq('id', req.user.userId)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to check Shopify status' });
    }

    res.json({
      connected: !!user.shopify_shop,
      shop: user.shopify_shop || null
    });
  } catch (error) {
    console.error('Shopify status error:', error);
    res.status(500).json({ error: 'Failed to check Shopify status' });
  }
});

// GET /api/user/assigned-app - Get user's assigned Shopify app
router.get('/user/assigned-app', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabaseService
      .from('users')
      .select('assigned_app_id')
      .eq('id', req.user.userId)
      .single();

    if (error || !user.assigned_app_id) {
      return res.json({ assignedApp: null });
    }

    const { data: app, error: appError } = await supabaseService
      .from('shopify_apps')
      .select('*')
      .eq('id', user.assigned_app_id)
      .single();

    if (appError) {
      return res.json({ assignedApp: null });
    }

    res.json({ assignedApp: app });
  } catch (error) {
    console.error('Assigned app error:', error);
    res.status(500).json({ error: 'Failed to get assigned app' });
  }
});

// GET /api/orders - Get user's Shopify orders from last 30 days
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const { shop, accessToken } = await getShopifyCredentials(req);

    // Fetch orders from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let allOrders = [];
    let url = `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${thirtyDaysAgo.toISOString()}&limit=250`;
    let pageCount = 0;

    // Paginate through all orders
    while (url && pageCount < 10) {
      pageCount++;
      const response = await axios.get(url, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      });

      const pageOrders = response.data.orders || [];
      allOrders = allOrders.concat(pageOrders);

      // Parse Link header for next page
      const linkHeader = response.headers['link'];
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        url = nextMatch ? nextMatch[1] : null;
      } else {
        url = null;
      }
    }

    // Map to frontend-expected format with product details
    const orders = allOrders.map(order => ({
      id: order.id,
      order_number: order.order_number,
      customer_name: order.customer?.first_name && order.customer?.last_name
        ? `${order.customer.first_name} ${order.customer.last_name}`
        : order.customer?.email || 'Guest',
      total_price: order.total_price,
      line_items_count: order.line_items?.length || 0,
      created_at: order.created_at,
      financial_status: order.financial_status,
      // Add product names from line items
      products: order.line_items?.map(item => ({
        name: item.name || item.title || 'Unknown Product',
        quantity: item.quantity || 1,
        price: item.price
      })) || [],
      // Quick summary of products
      product_summary: order.line_items?.length > 0
        ? order.line_items.map(item => `${item.name || item.title} (x${item.quantity || 1})`).join(', ')
        : 'No items'
    }));

    // Sort by date descending (most recent first)
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log(`📦 Fetched ${orders.length} orders from last 30 days`);
    res.json({ orders });

  } catch (error) {
    console.error('Orders error:', error);
    // Return empty array if Shopify not connected, rather than error
    if (error.message.includes('No active Shopify connection')) {
      return res.json({ orders: [] });
    }
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/stats - Get user's stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get products with their data
    const { data: products } = await supabaseService
      .from('products')
      .select('*')
      .eq('user_id', userId);

    // Get pending recommendations with product data
    const { data: recommendations } = await supabaseService
      .from('recommendations')
      .select('*')
      .eq('user_id', userId);

    // Get orders from last 30 days for revenue calculation
    const { data: orders } = await supabaseService
      .from('products')
      .select('total_sales_30d, revenue_30d')
      .eq('user_id', userId);

    // Get price changes from this month for historical profit
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: priceChanges } = await supabaseService
      .from('price_changes')
      .select('old_price, new_price, profit_impact, product_id, created_at')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    // Calculate historical profit from applied price changes this month
    let historicalProfit = 0;
    if (priceChanges && priceChanges.length > 0) {
      priceChanges.forEach(change => {
        // Use profit_impact if available, otherwise estimate from price difference
        if (change.profit_impact) {
          historicalProfit += parseFloat(change.profit_impact);
        } else {
          // Estimate: (new_price - old_price) * estimated monthly sales
          const product = products?.find(p => p.id === change.product_id);
          const priceDiff = parseFloat(change.new_price) - parseFloat(change.old_price);
          const monthlySales = product?.total_sales_30d || 0;
          historicalProfit += priceDiff * monthlySales;
        }
      });
    }

    // Calculate total potential profit from pending recommendations
    // IMPROVED: Account for elasticity and actual profit margins
    let totalPotentialProfit = 0;
    if (recommendations && recommendations.length > 0) {
      recommendations.forEach(rec => {
        const product = products?.find(p => p.id === rec.product_id);
        if (product && product.sales_velocity > 0) {
          const currentPrice = parseFloat(product.price);
          const recommendedPrice = parseFloat(rec.recommended_price);
          const costPrice = parseFloat(product.cost_price) || 0;
          const currentVelocity = parseFloat(product.sales_velocity);

          // Use elasticity to estimate new velocity (default -1.2 elasticity)
          const elasticity = -1.2;
          const priceRatio = recommendedPrice / currentPrice;
          const velocityMultiplier = Math.pow(priceRatio, elasticity);
          const newVelocity = currentVelocity * velocityMultiplier;

          // Calculate actual profit change (revenue - cost)
          const currentMonthlyProfit = (currentPrice - costPrice) * currentVelocity * 30;
          const newMonthlyProfit = (recommendedPrice - costPrice) * newVelocity * 30;
          const profitChange = newMonthlyProfit - currentMonthlyProfit;

          // Use the improved elasticity-aware calculation
          // Only add if it's actually profitable (positive change)
          if (profitChange > 0) {
            totalPotentialProfit += profitChange;
          } else if (costPrice === 0) {
            // Fallback to simple calculation if no cost price set
            const priceChange = recommendedPrice - currentPrice;
            const monthlyProfit = priceChange * product.sales_velocity * 30;
            totalPotentialProfit += monthlyProfit;
          }
        }
      });
    }

    // Calculate total revenue from last 30 days
    const totalRevenue = orders?.reduce((sum, p) => sum + (parseFloat(p.revenue_30d) || 0), 0) || 0;
    const totalOrders = orders?.reduce((sum, p) => sum + (parseInt(p.total_sales_30d) || 0), 0) || 0;

    res.json({
      totalProducts: products?.length || 0,
      totalRecommendations: recommendations?.length || 0,
      profitIncrease: Math.max(0, totalPotentialProfit), // Ensure non-negative
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      productsAnalyzed: products?.filter(p => p.last_analyzed_at).length || 0,
      historicalProfit: Math.max(0, historicalProfit), // Profit from applied changes this month
      appliedChangesCount: priceChanges?.length || 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
