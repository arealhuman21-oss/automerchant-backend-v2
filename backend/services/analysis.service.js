const {supabase} = require('../config/database');
const { analyzeProductV3 } = require('../analyzeProduct-v3');
const {
  loadRegretBudgets,
  loadElasticityLearners,
  loadPriceChangeObservations,
  saveV3State,
  saveV3Metadata,
} = require('../v3-persistence');
const config = require('../config/environment');
const axios = require('axios');

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
    
    let allOrders = [];
    let url = `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${thirtyDaysAgo.toISOString()}&limit=250`;
    let pageCount = 0;

    console.log('🔄 Fetching all orders with pagination...');

    while (url) {
      pageCount++;
      console.log(`   Page ${pageCount}: Fetching ${url}`);

      const response = await axios.get(url, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      });

      const pageOrders = response.data.orders || [];
      allOrders = allOrders.concat(pageOrders);
      console.log(`   ✅ Page ${pageCount}: Got ${pageOrders.length} orders (Total so far: ${allOrders.length})`);

      // Parse Link header for next page (Shopify pagination)
      const linkHeader = response.headers['link'];
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        url = nextMatch ? nextMatch[1] : null;
      } else {
        url = null;
      }

      // Safety limit: prevent infinite loops
      if (pageCount > 100) {
        console.warn('⚠️ Reached 100 pages, stopping pagination');
        break;
      }
    }

    console.log(`📦 TOTAL ORDERS FETCHED: ${allOrders.length} orders across ${pageCount} page(s)`);
    const orders = allOrders;

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

  if (config.USE_ALGORITHM_V3) {
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
      console.log(`
🔍 Analyzing product: ${product.title} (ID: ${product.id})`);
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
          if (config.USE_ALGORITHM_V3 && analysis.v3Metadata && newRec) {
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
  if (config.USE_ALGORITHM_V3) {
    try {
      const shopId = allProducts[0]?.shop_id || null;
      await saveV3State(supabase, userId, shopId, regretBudgets, elasticityLearners);
    } catch (error) {
      console.error('⚠️ V3 state saving failed:', error.message);
    }
  }

  console.log(`
✅ Analysis complete for user ${userId}: ${recommendationsCreated} recommendations created`);
  return { recommendationsCreated };
}

/**
 * Check if manual analysis is allowed (3/day limit)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} { allowed, used, remaining }
 */
async function checkManualAnalysisLimit(userId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayISO = startOfDay.toISOString();

  const { count: manualCount, error: countError } = await supabase
    .from('manual_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfDayISO);

  if (countError) {
    throw new Error('Failed to check manual analysis limit');
  }

  const dailyLimit = 3;
  const allowed = manualCount < dailyLimit;

  return {
    allowed,
    used: manualCount,
    remaining: dailyLimit - manualCount
  };
}

/**
 * Get analysis status (timer, limits, etc.)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Status object
 */
async function getAnalysisStatus(userId) {
  const now = new Date().toISOString();

  // Get user's last analysis
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('last_analysis, created_at')
    .eq('id', userId)
    .single();

  if (userError) throw userError;

  // Count manual analyses today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayISO = startOfDay.toISOString();

  const { count: manualCount, error: countError } = await supabase
    .from('manual_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfDayISO);

  if (countError) throw countError;

  // Get next analysis due time
  const { data: scheduleData } = await supabase
    .from('analysis_schedule')
    .select('next_analysis_due')
    .eq('user_id', userId)
    .single();

  const nextAnalysisDue = scheduleData?.next_analysis_due || null;

  // Calculate time until next
  let timeUntilNext = 0;
  if (nextAnalysisDue) {
    const nextTime = new Date(nextAnalysisDue).getTime();
    const currentTime = new Date().getTime();
    timeUntilNext = Math.max(0, nextTime - currentTime);
  }

  const canRunNow = timeUntilNext === 0 && manualCount < 3;

  return {
    canRunNow,
    timeUntilNextMs: timeUntilNext,
    timeUntilNextMinutes: Math.ceil(timeUntilNext / 60000),
    manualAnalysesToday: manualCount,
    dailyLimit: 3,
    lastAnalysis: userData?.last_analysis || null,
    nextAnalysisDue,
    userCreatedAt: userData?.created_at || null
  };
}

module.exports = {
  runAnalysisForUser,
  checkManualAnalysisLimit,
  getAnalysisStatus
};