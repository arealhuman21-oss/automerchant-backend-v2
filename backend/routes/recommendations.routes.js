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

// GET /api/recommendations - Get all recommendations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get recommendations with product info
    const { data: recommendations, error } = await supabaseService
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

    console.log(`📊 GET /api/recommendations for userId ${userId}:`);
    console.log(`   Found ${formattedRecommendations.length} recommendations`);
    formattedRecommendations.forEach((rec, idx) => {
      console.log(`   [${idx}] ID: ${rec.id}, Product ID: ${rec.product_id}, Recommended Price: ${rec.recommended_price}, Status: ${rec.status}, Product: ${rec.products ? rec.products.title : 'NULL'}`);
    });

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
    const userId = req.user.userId;

    // Get the recommendation
    const { data: recommendation, error: recError } = await supabaseService
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
    const { shop, accessToken } = await getShopifyCredentials(req);

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
    // SECURITY: Include user_id check to prevent privilege escalation
    const { error: updateError } = await supabaseService
      .from('recommendations')
      .update({
        status: 'accepted',
        applied_at: new Date().toISOString(),
        shopify_response: response.data
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating recommendation status:', updateError);
    }

    // Update the product price in our database
    // SECURITY: Include user_id check to prevent privilege escalation
    const { error: productUpdateError } = await supabaseService
      .from('products')
      .update({
        price: recommendation.new_price,
        updated_at: new Date().toISOString()
      })
      .eq('id', product.id)
      .eq('user_id', userId);

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

// Reject recommendation handler (shared by POST and GET)
async function rejectRecommendationHandler(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log(`📥 Rejecting recommendation ${id} for user ${userId}`);

    // First, just update the status (rejected_at might not exist)
    const { data: updatedRec, error } = await supabaseService
      .from('recommendations')
      .update({ status: 'rejected' })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting recommendation:', error);
      return res.status(500).json({ error: 'Failed to reject recommendation', details: error.message });
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
    res.status(500).json({ error: 'Failed to reject recommendation', details: error.message });
  }
}

// POST /api/recommendations/:id/reject - Reject recommendation
router.post('/:id/reject', authenticateToken, validate(schemas.id, 'params'), rejectRecommendationHandler);

// GET /api/recommendations/:id/reject - Fallback for form submissions
router.get('/:id/reject', authenticateToken, validate(schemas.id, 'params'), rejectRecommendationHandler);

// POST /api/recommendations/:id/apply - Apply recommendation (update Shopify price)
router.post(
  '/:id/apply',
  authenticateToken,
  async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Get the recommendation with product data
    const { data: recommendation, error: recError } = await supabaseService
      .from('recommendations')
      .select('*, product_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (recError || !recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    // Get the product
    const { data: product, error: productError } = await supabaseService
      .from('products')
      .select('*')
      .eq('id', recommendation.product_id)
      .eq('user_id', userId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const oldPrice = parseFloat(product.price);
    const newPrice = parseFloat(recommendation.recommended_price);

    // Get Shopify credentials
    const { shop, accessToken } = await getShopifyCredentials(req);

    // Update the product price on Shopify
    const updateData = {
      variant: {
        id: parseInt(product.shopify_variant_id),
        price: newPrice.toFixed(2)
      }
    };

    console.log(`🔄 Updating Shopify price for variant ${product.shopify_variant_id}: $${oldPrice} → $${newPrice}`);

    const response = await axios.put(
      `https://${shop}/admin/api/2024-01/variants/${product.shopify_variant_id}.json`,
      updateData,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Shopify price updated successfully');

    // Record price change in price_changes table
    await supabaseService
      .from('price_changes')
      .insert({
        user_id: userId,
        product_id: product.id,
        old_price: oldPrice,
        new_price: newPrice,
        recommendation_id: id,
        created_at: new Date().toISOString()
      });

    // Update recommendation status to accepted
    await supabaseService
      .from('recommendations')
      .update({
        status: 'accepted',
        applied_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId);

    // Update the product price in our database
    await supabaseService
      .from('products')
      .update({
        price: newPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', product.id)
      .eq('user_id', userId);

    console.log('✅ Database updated with new price');

    res.json({
      success: true,
      message: `Price updated from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)}`,
      oldPrice,
      newPrice
    });

  } catch (error) {
    console.error('❌ Apply recommendation error:', error);
    res.status(500).json({
      error: 'Failed to apply recommendation',
      message: error.message
    });
  }
});

module.exports = router;
