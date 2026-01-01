/**
 * Activity Logger Utility
 * Logs all user actions to the user_activity_log table for analytics
 */

const { supabaseService } = require('../config/database');

// Action types
const ACTIONS = {
  // Auth
  LOGIN: 'login',
  LOGOUT: 'logout',
  OAUTH_START: 'oauth_start',
  OAUTH_COMPLETE: 'oauth_complete',
  CUSTOM_APP_INSTALL: 'custom_app_install',

  // Products
  SYNC_PRODUCTS: 'sync_products',
  REFRESH_PRODUCTS: 'refresh_products',
  UPDATE_COST_PRICE: 'update_cost_price',
  SELECT_PRODUCT: 'select_product',
  DESELECT_PRODUCT: 'deselect_product',

  // Analysis
  RUN_ANALYSIS: 'run_analysis',
  AUTO_ANALYSIS: 'auto_analysis',

  // Recommendations
  RECOMMENDATION_CREATED: 'recommendation_created',
  RECOMMENDATION_ACCEPTED: 'recommendation_accepted',
  RECOMMENDATION_REJECTED: 'recommendation_rejected',
  PRICE_APPLIED: 'price_applied',

  // Admin
  USER_APPROVED: 'user_approved',
  USER_SUSPENDED: 'user_suspended',

  // Other
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_ORDERS: 'view_orders',
  ONBOARDING_COMPLETE: 'onboarding_complete'
};

/**
 * Log a user activity
 * @param {Object} options
 * @param {number} options.userId - User ID (optional for pre-auth events)
 * @param {string} options.action - Action type from ACTIONS
 * @param {Object} options.details - Additional details as JSON
 * @param {Object} options.req - Express request object (for IP/user-agent)
 */
async function logActivity({ userId = null, action, details = {}, req = null }) {
  try {
    const logEntry = {
      user_id: userId,
      action,
      details,
      created_at: new Date().toISOString()
    };

    // Add request info if available
    if (req) {
      logEntry.ip_address = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
      logEntry.user_agent = req.headers['user-agent'];
    }

    const { error } = await supabaseService
      .from('user_activity_log')
      .insert(logEntry);

    if (error) {
      // Don't throw - logging should never break the app
      console.warn('Activity log insert failed:', error.message);
    }
  } catch (err) {
    // Silently fail - logging should never break the app
    console.warn('Activity logging error:', err.message);
  }
}

/**
 * Log recommendation history
 * @param {Object} options
 */
async function logRecommendationHistory({
  userId,
  productId,
  recommendationId,
  action,
  oldPrice,
  recommendedPrice,
  newPrice = null,
  reasoning = null,
  urgency = null,
  confidence = null
}) {
  try {
    const { error } = await supabaseService
      .from('recommendation_history')
      .insert({
        user_id: userId,
        product_id: productId,
        recommendation_id: recommendationId,
        action,
        old_price: oldPrice,
        recommended_price: recommendedPrice,
        new_price: newPrice,
        reasoning,
        urgency,
        confidence,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Recommendation history insert failed:', error.message);
    }
  } catch (err) {
    console.warn('Recommendation history logging error:', err.message);
  }
}

/**
 * Get activity summary for a user
 * @param {number} userId
 * @param {number} days - Number of days to look back
 */
async function getUserActivitySummary(userId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabaseService
      .from('user_activity_log')
      .select('action, created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Aggregate by action type
    const summary = {};
    data.forEach(log => {
      summary[log.action] = (summary[log.action] || 0) + 1;
    });

    return {
      totalActions: data.length,
      actionCounts: summary,
      lastActivity: data[0]?.created_at || null
    };
  } catch (err) {
    console.warn('Failed to get activity summary:', err.message);
    return null;
  }
}

module.exports = {
  ACTIONS,
  logActivity,
  logRecommendationHistory,
  getUserActivitySummary
};
