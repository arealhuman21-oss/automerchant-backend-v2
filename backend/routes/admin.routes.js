const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const { supabaseService } = require('../config/database');
const { logActivity, ACTIONS } = require('../utils/activityLogger');

// GET /api/admin/db-check - Check database tables (no auth for diagnostics)
router.get('/db-check', async (req, res) => {
  try {
    const results = {
      supabaseClientExists: !!supabaseService,
      tables: {}
    };

    // Check users table
    const { data: usersCheck, error: usersError } = await supabaseService
      .from('users')
      .select('id')
      .limit(1);
    results.tables.users = usersError ? `ERROR: ${JSON.stringify(usersError)}` : 'OK';

    // Check products table
    const { data: productsCheck, error: productsError } = await supabaseService
      .from('products')
      .select('id')
      .limit(1);
    results.tables.products = productsError ? `ERROR: ${JSON.stringify(productsError)}` : 'OK';

    // Check recommendations table
    const { data: recsCheck, error: recsError } = await supabaseService
      .from('recommendations')
      .select('id')
      .limit(1);
    results.tables.recommendations = recsError ? `ERROR: ${JSON.stringify(recsError)}` : 'OK';

    // Check manual_analyses table (THIS IS THE PROBLEM TABLE)
    const { data: manualCheck, error: manualError } = await supabaseService
      .from('manual_analyses')
      .select('id')
      .limit(1);
    results.tables.manual_analyses = manualError ? `ERROR: ${JSON.stringify(manualError)}` : 'OK';

    // Check analysis_schedule table
    const { data: scheduleCheck, error: scheduleError } = await supabaseService
      .from('analysis_schedule')
      .select('id')
      .limit(1);
    results.tables.analysis_schedule = scheduleError ? `ERROR: ${JSON.stringify(scheduleError)}` : 'OK';

    // Check system_cron_runs table
    const { data: cronCheck, error: cronError } = await supabaseService
      .from('system_cron_runs')
      .select('id')
      .limit(1);
    results.tables.system_cron_runs = cronError ? `ERROR: ${JSON.stringify(cronError)}` : 'OK';

    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: 'Database check failed',
      message: error.message
    });
  }
});

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

    // Log activity
    await logActivity({
      userId: userId,
      action: ACTIONS.USER_APPROVED,
      details: {
        approved_by_admin: req.admin.id,
        user_email: updatedUser.email
      },
      req
    });

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

// GET /api/admin/users - Get all users
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabaseService
      .from('users')
      .select('id, email, approved, suspended, shopify_shop, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    res.json({ users: users || [] });

  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/apps - Get all Shopify apps
router.get('/apps', authenticateAdmin, async (req, res) => {
  try {
    const { data: apps, error } = await supabaseService
      .from('shopify_apps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching apps:', error);
      return res.status(500).json({ error: 'Failed to fetch apps' });
    }

    res.json({ apps: apps || [] });

  } catch (error) {
    console.error('Admin apps error:', error);
    res.status(500).json({ error: 'Failed to fetch apps' });
  }
});

module.exports = router;
