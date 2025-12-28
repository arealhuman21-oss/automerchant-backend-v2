const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { supabase } = require('../config/database');

// Helper function to get Shopify credentials based on AUTH_MODE
async function getShopifyCredentials(req, supabase) {
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
    const userId = req.user.id;

    // Get shop and token from shops table
    const { data: shopData, error: shopError } = await supabase
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

// GET /api/recommendations - Get all recommendations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get recommendations with product info
    const { data: recommendations, error } = await supabase
      .from('recommendations')
      .select(`
        *,
        products (id, title, price, image_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recommendations:', error);
      return res.status(500).json({ error: 'Failed to fetch recommendations' });
    }

    // Format response to include product details
    const formattedRecommendations = recommendations.map(rec => ({
      ...rec,
      product: rec.products
    }));

    res.json({ recommendations: formattedRecommendations });

  } catch (error) {
    console.error('Recommendations fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// POST /api/recommendations/:id/accept - Apply price
router.post(
  '/:id/accept',
  authenticateToken,
  validate(schemas.id, 'params'),
  async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get the recommendation
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select(`
        *,
        products (id, shopify_product_id, shopify_variant_id, shop_domain)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (recError || !recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    if (recommendation.products.length === 0) {
      return res.status(404).json({ error: 'Associated product not found' });
    }

    const product = recommendation.products;

    // Get Shopify credentials
    const { shop, accessToken } = await getShopifyCredentials(req, supabase);

    // Update the product price on Shopify
    const updateData = {
      product: {
        id: parseInt(product.shopify_product_id),
        variants: [{
          id: parseInt(product.shopify_variant_id),
          price: recommendation.new_price
        }]
      }
    };

    const response = await axios.put(
      `https://${shop}/admin/api/2024-01/products/${product.shopify_product_id}.json`,
      updateData,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    // Update recommendation status to accepted
    const { error: updateError } = await supabase
      .from('recommendations')
      .update({
        status: 'accepted',
        applied_at: new Date().toISOString(),
        shopify_response: response.data
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating recommendation status:', updateError);
    }

    // Update the product price in our database
    const { error: productUpdateError } = await supabase
      .from('products')
      .update({
        price: recommendation.new_price,
        updated_at: new Date().toISOString()
      })
      .eq('id', product.id);

    if (productUpdateError) {
      console.error('Error updating product price:', productUpdateError);
    }

    res.json({
      success: true,
      message: 'Price updated successfully on Shopify',
      shopify_response: response.data
    });

  } catch (error) {
    console.error('Accept recommendation error:', error);
    res.status(500).json({
      error: 'Failed to update price on Shopify',
      message: error.message
    });
  }
});

// POST /api/recommendations/:id/reject - Reject recommendation
router.post(
  '/:id/reject',
  authenticateToken,
  validate(schemas.id, 'params'),
  async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Update recommendation status to rejected
    const { data: updatedRec, error } = await supabase
      .from('recommendations')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting recommendation:', error);
      return res.status(500).json({ error: 'Failed to reject recommendation' });
    }

    if (!updatedRec) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    res.json({
      success: true,
      message: 'Recommendation rejected',
      recommendation: updatedRec
    });

  } catch (error) {
    console.error('Reject recommendation error:', error);
    res.status(500).json({ error: 'Failed to reject recommendation' });
  }
});

module.exports = router;
