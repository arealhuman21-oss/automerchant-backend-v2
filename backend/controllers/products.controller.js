const productModel = require('../models/product.model');
const shopifyService = require('../services/shopify.service');
const { supabase } = require('../config/database');
const config = require('../config/environment');

/**
 * Helper to get Shopify credentials
 */
async function getShopifyCredentials(userId) {
  if (config.AUTH_MODE === 'manual') {
    const shop = config.SHOP;
    const accessToken = config.SHOPIFY_ACCESS_TOKEN;
    if (!shop || !accessToken) {
      throw new Error('SHOP and SHOPIFY_ACCESS_TOKEN must be set in environment');
    }
    return { shop, accessToken };
  } else {
    const { data: shopData, error } = await supabase
      .from('shops')
      .select('shop_domain, access_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !shopData) {
      throw new Error('No active Shopify connection found');
    }

    return { shop: shopData.shop_domain, accessToken: shopData.access_token };
  }
}

/**
 * GET /api/products
 */
async function getProducts(req, res) {
  try {
    const userId = req.user.id;
    const products = await productModel.findByUserId(userId);
    res.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}

/**
 * POST /api/products/sync
 */
async function syncProducts(req, res) {
  try {
    const userId = req.user.id;
    const { shop, accessToken } = await getShopifyCredentials(userId);

    // Fetch from Shopify
    const shopifyProducts = await shopifyService.fetchShopifyProducts(shop, accessToken);

    // Transform and save
    const productsToSave = shopifyProducts.map(p => ({
      user_id: userId,
      shopify_product_id: p.id.toString(),
      shopify_variant_id: p.variants[0]?.id.toString(),
      title: p.title,
      price: parseFloat(p.variants[0]?.price || 0),
      inventory: p.variants[0]?.inventory_quantity || 0,
      image_url: p.image?.src
    }));

    await productModel.bulkUpsert(productsToSave);

    res.json({ success: true, count: productsToSave.length });
  } catch (error) {
    console.error('Error syncing products:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/products/:id/cost-price
 */
async function updateCostPrice(req, res) {
  try {
    const { id } = req.params;
    const { costPrice } = req.body;

    await productModel.updateCostPrice(parseInt(id), parseFloat(costPrice));
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating cost price:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/products/:id/select
 */
async function toggleSelection(req, res) {
  try {
    const { id } = req.params;
    const { selected } = req.body;

    await productModel.toggleSelection(parseInt(id), selected);
    res.json({ success: true });
  } catch (error) {
    console.error('Error toggling selection:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getProducts,
  syncProducts,
  updateCostPrice,
  toggleSelection
};
