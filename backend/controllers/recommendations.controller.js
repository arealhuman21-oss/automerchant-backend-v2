const recommendationModel = require('../models/recommendation.model');
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
 * GET /api/recommendations
 */
async function getRecommendations(req, res) {
  try {
    const userId = req.user.id;
    const recommendations = await recommendationModel.findByUserId(userId);
    res.json({ recommendations });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
}

/**
 * POST /api/recommendations/:id/accept
 */
async function acceptRecommendation(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { shop, accessToken } = await getShopifyCredentials(userId);

    // Get recommendation
    const rec = await recommendationModel.findById(parseInt(id));
    if (!rec) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    // Get product
    const product = await productModel.findById(rec.product_id);

    // Update Shopify
    await shopifyService.updateProductPrice(
      shop,
      accessToken,
      product.shopify_variant_id,
      rec.recommended_price
    );

    // Update local DB
    await productModel.update(product.id, { price: rec.recommended_price });

    // Delete recommendation
    await recommendationModel.deleteById(rec.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting recommendation:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/recommendations/:id/reject
 */
async function rejectRecommendation(req, res) {
  try {
    const { id } = req.params;
    await recommendationModel.deleteById(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting recommendation:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getRecommendations,
  acceptRecommendation,
  rejectRecommendation
};
