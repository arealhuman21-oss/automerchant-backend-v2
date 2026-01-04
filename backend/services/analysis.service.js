const {supabaseService} = require('../config/database');
const { analyzeProductV3 } = require('../analyzeProduct-v3');

// Verify Supabase connection on module load
if (!supabaseService) {
  console.error('❌ CRITICAL: supabaseService is not initialized!');
}
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
    const { data: user, error: userError } = await supabaseService
      .from('users')
      .select('shopify_shop')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.shopify_shop) {
      return;
    }

    const { data: shopData, error: shopError } = await supabaseService
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
    
    let allOrders = [];
    let url = `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${thirtyDaysAgo.toISOString()}&limit=250`;
    let pageCount = 0;


    while (url) {
      pageCount++;

      const response = await axios.get(url, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      });

      const pageOrders = response.data.orders || [];
      allOrders = allOrders.concat(pageOrders);

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
        break;
      }
    }

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
    const { data: shopDataForSync } = await supabaseService
      .from('shops')
      .select('shop_domain, app_id')
      .eq('shop_domain', shop)
      .eq('is_active', true)
      .single();

    const shopDomain = shopDataForSync?.shop_domain || shop;
    const appId = shopDataForSync?.app_id || null;

    // Update products table with fresh data (preserving user-set values)
    for (const product of productsResponse.data.products) {
      const variant = product.variants[0];
      const variantId = variant.id.toString();
      const totalSales = variantSales[variantId] || 0;
      const totalRevenue = variantRevenue[variantId] || 0;
      const salesVelocity = totalSales / 30;

      // DEBUG: Log what Shopify returns

      // CRITICAL FIX: Only UPDATE sales data, don't touch cost_price!
      // Use UPDATE instead of UPSERT to preserve user-set fields
      const { error: updateError } = await supabaseService
        .from('products')
        .update({
          title: product.title,
          price: variant.price,
          inventory: variant.inventory_quantity || 0,
          image_url: product.image?.src || null,
          total_sales_30d: totalSales,
          revenue_30d: totalRevenue,
          sales_velocity: salesVelocity,
          updated_at: new Date().toISOString()
          // NOTE: cost_price and selected_for_analysis are NOT touched here
        })
        .eq('user_id', userId)
        .eq('shopify_variant_id', variantId);

      if (updateError) {
        // Product doesn't exist yet, insert it (new product from Shopify)
        await supabaseService
          .from('products')
          .insert({
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
            updated_at: new Date().toISOString(),
            cost_price: null,
            selected_for_analysis: true
          });
      }
    }

  } catch (syncError) {
    console.error(`⚠️ Product sync failed for user ${userId}, continuing with database data:`, syncError.message);
    // Continue anyway - better to analyze with slightly stale data than skip analysis
  }

  const { data: products, error: productsError } = await supabaseService
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .eq('selected_for_analysis', true);

  if (productsError || !products || products.length === 0) {
    return;
  }

  products.forEach(p => {
  });

  const allProducts = products;
  const userSettings = { target_margin: 0.40 };  // CRITICAL FIX: Must be decimal (0.40 = 40%), not integer (40)

  // Get price decrease history (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: decreaseHistory, error: historyError } = await supabaseService
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

  // ALWAYS use V3 algorithm (V2 removed)
  // Load V3 state: regret budgets, elasticity learners, price history
  try {
    regretBudgets = await loadRegretBudgets(supabaseService, userId);
    elasticityLearners = await loadElasticityLearners(supabaseService, userId);

    // Load price change observations for elasticity learning
    for (const product of allProducts) {
      const observations = await loadPriceChangeObservations(supabaseService, userId, product.id, 10);
      if (observations.length > 0) {
        priceHistory[product.id] = observations;
      }
    }

  } catch (error) {
    console.error('⚠️ V3 state loading failed (tables may not exist yet):', error.message);
    // Continue with empty state - will still work but without learning history
    // Don't throw - allow analysis to run with default priors
  }

  let recommendationsCreated = 0;

  for (const product of allProducts) {
    try {
// 🔍 Analyzing product: ${product.title} (ID: ${product.id})`);
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

      // CRITICAL FIX: Only create recommendation if price actually changes
      const currentPrice = parseFloat(product.price);
      const recommendedPrice = parseFloat(analysis.recommendedPrice);
      const priceActuallyChanges = Math.abs(recommendedPrice - currentPrice) >= 0.01; // At least 1 cent difference

      if (analysis.shouldChangePrice && priceActuallyChanges) {
        // UPSERT to prevent duplicate recommendations (atomic operation)
        const { data: newRec, error: upsertError } = await supabaseService
          .from('recommendations')
          .upsert({
            user_id: userId,
            product_id: product.id,
            recommended_price: analysis.recommendedPrice,
            reasoning: analysis.reasoning,
            urgency: analysis.urgency || 'MEDIUM',
            confidence: analysis.confidence,
            status: 'pending',  // CRITICAL: Reset status so rejected recs get shown again!
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

          // Save V3 metadata (always use V3)
          if (analysis.v3Metadata && newRec) {
            await saveV3Metadata(supabaseService, newRec.id, analysis.v3Metadata);
          }
        }
      } else {
      }

      await supabaseService
        .from('products')
        .update({ last_analyzed_at: new Date().toISOString() })
        .eq('id', product.id);

    } catch (error) {
      console.error(`❌ Error analyzing product ${product.id}:`, error);
      console.error(`   Stack trace:`, error.stack);
    }
  }

  // ============================================
  // V3: SAVE PERSISTENCE STATE (always runs)
  // ============================================
  try {
    const shopId = allProducts[0]?.shop_id || null;
    await saveV3State(supabaseService, userId, shopId, regretBudgets, elasticityLearners);
  } catch (error) {
    console.error('⚠️ V3 state saving failed:', error.message);
  }

// ✅ Analysis complete for user ${userId}: ${recommendationsCreated} recommendations created`);
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


  let manualCount = 0;
  try {
    const result = await supabaseService
      .from('manual_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDayISO);

    if (result.error) {
      // FALLBACK: If table doesn't exist or query fails, allow analysis anyway
      return {
        allowed: true,
        used: 0,
        remaining: 10,
        dailyLimit: 10
      };
    }

    manualCount = result.count || 0;
  } catch (queryError) {
    // FALLBACK: If exception occurs, allow analysis anyway
    return {
      allowed: true,
      used: 0,
      remaining: 10,
      dailyLimit: 10
    };
  }


  const dailyLimit = 10;
  const allowed = manualCount < dailyLimit;

  return {
    allowed,
    used: manualCount,
    remaining: Math.max(0, dailyLimit - manualCount),
    dailyLimit
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
  const { data: userData, error: userError } = await supabaseService
    .from('users')
    .select('last_analysis, created_at')
    .eq('id', userId)
    .single();

  if (userError) {
    console.error('❌ Error getting user data:', JSON.stringify(userError, null, 2));
    throw new Error(`User query failed: ${userError.message || userError.code}`);
  }


  // Count manual analyses today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayISO = startOfDay.toISOString();

  let manualCount = 0;
  try {
    const { count, error: countError } = await supabaseService
      .from('manual_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDayISO);

    if (countError) {
      manualCount = 0;
    } else {
      manualCount = count || 0;
    }
  } catch (err) {
    manualCount = 0;
  }

  // Get next analysis due time
  const { data: scheduleData } = await supabaseService
    .from('analysis_schedule')
    .select('next_analysis_due')
    .eq('user_id', userId)
    .single();

  let nextAnalysisDue = scheduleData?.next_analysis_due || null;

  // CRITICAL FIX: If no schedule exists, create one aligned with cron schedule
  if (!scheduleData) {
    // Calculate next cron time (:00 and :30 marks)
    const now = new Date();
    const minutes = now.getMinutes();
    const nextCronMinute = minutes < 30 ? 30 : 60;
    const minutesToAdd = nextCronMinute - minutes;

    const nextCron = new Date(now.getTime() + minutesToAdd * 60 * 1000);
    nextCron.setSeconds(0);
    nextCron.setMilliseconds(0);

    // Create schedule entry
    await supabaseService
      .from('analysis_schedule')
      .insert({
        user_id: userId,
        next_analysis_due: nextCron.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      });

    nextAnalysisDue = nextCron.toISOString();
  }

  // Calculate time until next
  let timeUntilNext = 0;
  if (nextAnalysisDue) {
    const nextTime = new Date(nextAnalysisDue).getTime();
    const currentTime = new Date().getTime();
    timeUntilNext = Math.max(0, nextTime - currentTime);
  }

  const dailyLimit = 10; // CRITICAL: 10 manual analyses per day
  const canRunNow = timeUntilNext === 0 && manualCount < dailyLimit;

  return {
    canRunNow,
    timeUntilNextMs: timeUntilNext,
    timeUntilNextMinutes: Math.ceil(timeUntilNext / 60000),
    // Frontend-compatible field names
    timeRemaining: Math.floor(timeUntilNext / 1000), // Convert to seconds
    manualUsedToday: manualCount || 0,
    manualRemaining: Math.max(0, dailyLimit - (manualCount || 0)),
    dailyLimit,
    manualAnalysesToday: manualCount,
    lastAnalysis: userData?.last_analysis || null,
    nextAnalysisDue,
    userCreatedAt: userData?.created_at || null
  };
}

module.exports = {
  runAnalysisForUser,
  checkManualAnalysisLimit,
  getAnalysisStatus,
  handleAutoAnalysisCron // Export the new function
};

// Helper function to calculate next cron schedule time (aligns with :00 and :30 marks)
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

/**
 * Handles the logic for the automatic analysis cron job.
 * This function is designed to be called by an external trigger (e.g., /api/cron/auto-analysis).
 * It identifies users whose analysis is due and runs the analysis for them.
 *
 * @returns {Object} A summary of the cron job execution.
 */
async function handleAutoAnalysisCron() {
  const results = {
    usersProcessed: 0,
    usersSucceeded: 0,
    usersFailed: 0,
    errors: []
  };

  try {
    // Use supabaseService for cron jobs (needs access to all users)
    const { data: dueUsers, error: dueError } = await supabaseService
      .from('analysis_schedule')
      .select('user_id')
      .lte('next_analysis_due', new Date().toISOString());

    if (dueError) {
      throw dueError;
    }


    if (dueUsers) {
      for (const row of dueUsers) {
        const userId = row.user_id;
        results.usersProcessed++;

        try {
          await runAnalysisForUser(userId); // Use the existing function

          const now = new Date();
          const nextDue = getNextCronTime(); // Align with cron schedule (:00 and :30)

          // Use supabaseService for system operations
          await supabaseService
            .from('analysis_schedule')
            .update({
              last_analysis_run: now.toISOString(),
              next_analysis_due: nextDue.toISOString()
            })
            .eq('user_id', userId);

          results.usersSucceeded++;
        } catch (error) {
          results.usersFailed++;
          results.errors.push({ userId, error: error.message });
          console.error(`❌ [CRON] Error running analysis for user ${userId}:`, error);
        }
      }
    }
  } catch (error) {
    results.errors.push({ general: error.message });
    console.error('❌ [CRON] General background analysis job error:', error);
  }

  return results;
}