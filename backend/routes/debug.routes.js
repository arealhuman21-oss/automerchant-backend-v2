const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { supabaseService } = require('../config/database');

// DEBUG: Check user's Shopify connection
router.get('/check-connection', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    console.log('🔍 DEBUG: Checking connection for:', { userId, userEmail });

    // Get user details
    const { data: user, error: userError } = await supabaseService
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('User:', user, 'Error:', userError);

    // Get shops for this user
    const { data: shops, error: shopsError } = await supabaseService
      .from('shops')
      .select('*')
      .eq('user_id', userId);

    console.log('Shops:', shops, 'Error:', shopsError);

    // Get ALL shops (to check for orphans)
    const { data: allShops } = await supabaseService
      .from('shops')
      .select('shop_domain, user_id, is_active');

    res.json({
      debug: true,
      userId,
      userEmail,
      user: user || null,
      userError: userError?.message || null,
      shopsForUser: shops || [],
      shopsError: shopsError?.message || null,
      allShops: allShops || [],
      diagnosis: shops && shops.length > 0
        ? '✅ Shop found'
        : '❌ No shop linked to this user_id'
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

module.exports = router;
