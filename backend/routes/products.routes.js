const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { supabaseService } = require('../config/database');

// Helper function to get Shopify credentials based on AUTH_MODE
async function getShopifyCredentials(req) {
  const AUTH_MODE = process.env.AUTH_MODE || 'oauth';

  if (AUTH_MODE === 'manual') {
    // Manual mode: Use environment variables
    const shop = process.env.SHOP;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!shop || !accessToken) {
      throw new Error('SHOP and SHOPIFY_ACCESS_TOKEN must be set in environment for manual mode');
    }

    return { shop, accessToken };
  } else {
    // OAuth mode: Get from database using user_id
    const userId = req.user.userId;

    // Get shop and token from shops table
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

// GET /api/products
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: products, error } = await supabaseService
      .from('products')
      .select('*')
      .eq('user_id', req.user.userId)
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

// CRITICAL FIX: Fetch ALL orders using cursor-based pagination
async function fetchAllOrdersPaginated(shop, accessToken, thirtyDaysAgo) {
  let allOrders = [];
  let url = `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${thirtyDaysAgo.toISOString()}&limit=250`;
  let pageCount = 0;

  // console.log('🔄 Fetching all orders with pagination...');

  while (url) {
    pageCount++;
    // console.log(`   Page ${pageCount}: Fetching ${url}`);

    const response = await axios.get(url, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });

    const pageOrders = response.data.orders || [];
    allOrders = allOrders.concat(pageOrders);
    // console.log(`   ✅ Page ${pageCount}: Got ${pageOrders.length} orders (Total so far: ${allOrders.length})`);

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

  // console.log(`📦 TOTAL ORDERS FETCHED: ${allOrders.length} orders across ${pageCount} page(s)`);
  return allOrders;
}

// POST /api/products/sync
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    // ============================================
    // DUAL-MODE AUTH: Get credentials based on AUTH_MODE
    // ============================================
    const { shop, accessToken } = await getShopifyCredentials(req);

    const response = await axios.get(
      `https://${shop}/admin/api/2024-01/products.json?limit=250`,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // CRITICAL FIX: Use paginated fetch to get ALL orders (not just 250)
    const orders = await fetchAllOrdersPaginated(shop, accessToken, thirtyDaysAgo);
    const variantSales = {};
    const variantRevenue = {};

    // console.log(`📦 Processing ${orders.length} orders from last 30 days`);

    orders.forEach(order => {
      order.line_items?.forEach(item => {
        const variantId = item.variant_id?.toString();
        if (variantId) {
          const quantity = item.quantity || 0;
          const revenue = parseFloat(item.price) * quantity;
          variantSales[variantId] = (variantSales[variantId] || 0) + quantity;
          variantRevenue[variantId] = (variantRevenue[variantId] || 0) + revenue;
          // console.log(`  ✅ Variant ${variantId}: +${quantity} units, +$${revenue.toFixed(2)}`);
        }
      });
    });

    // console.log(`📊 Sales aggregated for ${Object.keys(variantSales).length} variants:`, variantSales);

    // Get shop and app_id from database
    const { data: shopData } = await supabaseService
      .from('shops')
      .select('shop_domain, app_id')
      .eq('user_id', req.user.userId)
      .eq('is_active', true)
      .single();

    const shopDomain = shopData?.shop_domain || shop;
    const appId = shopData?.app_id || null;

    let syncedCount = 0;
    // console.log(`\n🔄 Syncing ${response.data.products.length} products...`);

    for (const product of response.data.products) {
      const variant = product.variants[0];
      const variantId = variant.id.toString();
      const totalSales = variantSales[variantId] || 0;
      const totalRevenue = variantRevenue[variantId] || 0;
      const salesVelocity = totalSales / 30;

      // console.log(`\n📦 ${product.title}`);
      // console.log(`   Variant ID: ${variantId}`);
      // console.log(`   Sales (30d): ${totalSales} units`);
      // console.log(`   Revenue (30d): $${totalRevenue.toFixed(2)}`);
      // console.log(`   Velocity: ${salesVelocity.toFixed(3)} units/day`);

      // First, check if product exists to preserve cost_price and selected_for_analysis
      const { data: existingProduct, error: lookupError } = await supabaseService
        .from('products')
        .select('id, cost_price, selected_for_analysis')
        .eq('user_id', req.user.userId)
        .eq('shopify_variant_id', variantId)
        .single();

      // Debug logging for cost_price preservation
      if (existingProduct?.cost_price) {
        console.log(`📦 Sync ${product.title}: Preserving cost_price=${existingProduct.cost_price}`);
      }
      if (lookupError && lookupError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is expected for new products
        console.log(`⚠️ Sync ${product.title}: Lookup error - ${lookupError.message}`);
      }

      const productData = {
        user_id: req.user.userId,
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
        // PRESERVE user-set values
        cost_price: existingProduct?.cost_price || null,
        selected_for_analysis: existingProduct?.selected_for_analysis ?? true
      };

      const { error: upsertError, data: upsertData } = await supabaseService
        .from('products')
        .upsert(productData, {
          onConflict: 'user_id,shopify_variant_id'
        })
        .select();

      if (upsertError) {
        console.error('❌ Error upserting product:', upsertError);
      } else {
        // console.log('   ✅ Saved to database');
        syncedCount++;
      }
    }

    // console.log(`\n✅ Sync complete: ${syncedCount}/${response.data.products.length} products`);

    // DELETE products that no longer exist in Shopify
    // console.log('\n🗑️ Checking for deleted products...');

    // Get all Shopify variant IDs from this sync
    const shopifyVariantIds = response.data.products.map(p => p.variants[0].id.toString());

    // Find products in database that aren't in Shopify anymore
    const { data: dbProducts } = await supabaseService
      .from('products')
      .select('id, shopify_variant_id, title')
      .eq('user_id', req.user.userId);

    const productsToDelete = dbProducts.filter(
      dbProduct => !shopifyVariantIds.includes(dbProduct.shopify_variant_id)
    );

    if (productsToDelete.length > 0) {
      // console.log(`🗑️ Found ${productsToDelete.length} products to delete:`);
      // productsToDelete.forEach(p => console.log(`   - ${p.title} (Variant: ${p.shopify_variant_id})`));

      const { error: deleteError } = await supabaseService
        .from('products')
        .delete()
        .in('id', productsToDelete.map(p => p.id));

      if (deleteError) {
        console.error('❌ Error deleting products:', deleteError);
      } else {
        // console.log(`✅ Deleted ${productsToDelete.length} products from database`);
      }
    } else {
      // console.log('✅ No products to delete');
    }

    res.json({
      success: true,
      synced: syncedCount,
      total: response.data.products.length,
      deleted: productsToDelete.length
    });

  } catch (error) {
    console.error('❌ Product sync error:', error);
    res.status(500).json({
      error: 'Failed to sync products',
      message: error.message
    });
  }
});

// POST /api/products/:id/cost-price
router.post(
  '/:id/cost-price',
  authenticateToken,
  validate(schemas.id, 'params'),
  validate(schemas.costPrice, 'body'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { cost_price } = req.body;

      console.log(`💰 Cost price update request:`);
      console.log(`   Product ID: ${id}`);
      console.log(`   User ID: ${req.user.userId}`);
      console.log(`   cost_price received: ${cost_price} (type: ${typeof cost_price})`);

      // Update the product with the new cost price
      const { data: updateResult, error } = await supabaseService
        .from('products')
        .update({
          cost_price: cost_price,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', req.user.userId)
        .select('id, title, cost_price')
        .single();

      if (error) {
        console.error('❌ Cost price update error:', error);
        return res.status(500).json({ error: 'Failed to update cost price' });
      }

      console.log(`   ✅ Updated successfully:`, updateResult);

      res.json({ success: true, message: 'Cost price updated successfully', product: updateResult });

    } catch (error) {
      console.error('❌ Cost price update error:', error);
      res.status(500).json({ error: 'Failed to update cost price' });
    }
  }
);

// POST /api/products/:id/select
router.post(
  '/:id/select',
  authenticateToken,
  validate(schemas.id, 'params'),
  validate(schemas.productSelection, 'body'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { selected } = req.body;

      const { error } = await supabaseService
        .from('products')
        .update({ selected_for_analysis: selected })
        .eq('id', id)
        .eq('user_id', req.user.userId);

      if (error) {
        throw error;
      }

      res.json({ success: true, selected });
    } catch (error) {
      console.error('Product selection error:', error);
      res.status(500).json({ error: 'Failed to update product selection' });
    }
  }
);

module.exports = router;
