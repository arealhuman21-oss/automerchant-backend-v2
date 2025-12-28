const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const { supabaseService } = require('../config/database');

// GET /api/admin/stats - Admin statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    // Get total user count
    // Use supabaseService for admin operations (needs access to all data)
    const { count: totalUsers, error: userError } = await supabaseService
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (userError) {
      console.error('Error fetching user count:', userError);
      return res.status(500).json({ error: 'Failed to fetch user statistics' });
    }

    // Get approved user count
    const { count: approvedUsers, error: approvedError } = await supabaseService
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('approved', true);

    if (approvedError) {
      console.error('Error fetching approved user count:', approvedError);
      return res.status(500).json({ error: 'Failed to fetch user statistics' });
    }

    // Get pending user count
    const { count: pendingUsers, error: pendingError } = await supabaseService
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('approved', false)
      .eq('suspended', false);

    if (pendingError) {
      console.error('Error fetching pending user count:', pendingError);
      return res.status(500).json({ error: 'Failed to fetch user statistics' });
    }

    // Get suspended user count
    const { count: suspendedUsers, error: suspendedError } = await supabaseService
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('suspended', true);

    if (suspendedError) {
      console.error('Error fetching suspended user count:', suspendedError);
      return res.status(500).json({ error: 'Failed to fetch user statistics' });
    }

    // Get total product count
    const { count: totalProducts, error: productError } = await supabaseService
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (productError) {
      console.error('Error fetching product count:', productError);
      return res.status(500).json({ error: 'Failed to fetch product statistics' });
    }

    // Get total recommendation count
    const { count: totalRecommendations, error: recError } = await supabaseService
      .from('recommendations')
      .select('*', { count: 'exact', head: true });

    if (recError) {
      console.error('Error fetching recommendation count:', recError);
      return res.status(500).json({ error: 'Failed to fetch recommendation statistics' });
    }

    res.json({
      stats: {
        totalUsers: totalUsers || 0,
        approvedUsers: approvedUsers || 0,
        pendingUsers: pendingUsers || 0,
        suspendedUsers: suspendedUsers || 0,
        totalProducts: totalProducts || 0,
        totalRecommendations: totalRecommendations || 0,
        approvalRate: totalUsers ? ((approvedUsers || 0) / totalUsers * 100).toFixed(2) : 0
      }
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

// POST /api/admin/approve-user - Approve user
router.post('/approve-user', authenticateAdmin, async (req, res) => {
  try {
    const { user_id, email } = req.body;

    if (!user_id && !email) {
      return res.status(400).json({ error: 'User ID or email is required' });
    }

    let userId = user_id;

    // If email provided instead of ID, look up the user
    if (email && !user_id) {
      const { data: userData, error: userError } = await supabaseService
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        return res.status(404).json({ error: 'User not found' });
      }

      userId = userData.id;
    }

    // Update user approval status
    const { data: updatedUser, error: updateError } = await supabaseService
      .from('users')
      .update({
        approved: true,
        approved_at: new Date().toISOString(),
        approved_by: req.admin.id
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error approving user:', updateError);
      return res.status(500).json({ error: 'Failed to approve user' });
    }

    // If user was previously suspended, also unsuspend them
    if (updatedUser.suspended) {
      await supabaseService
        .from('users')
        .update({ suspended: false })
        .eq('id', userId);
    }

    res.json({
      success: true,
      message: 'User approved successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        approved: updatedUser.approved,
        approved_at: updatedUser.approved_at
      }
    });

  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// Additional admin routes can be added here as needed

module.exports = router;
