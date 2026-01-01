const analysisService = require('../services/analysis.service');
const { supabaseService } = require('../config/database');
const { logActivity, ACTIONS } = require('../utils/activityLogger');

/**
 * GET /api/analysis/status
 */
async function getStatus(req, res) {
  try {
    const userId = req.user.userId;
    console.log('Getting analysis status for userId:', userId);
    const status = await analysisService.getAnalysisStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('Error getting analysis status:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.error('Error stack:', error.stack);

    // Return default status instead of failing
    res.json({
      canRunNow: false,
      timeUntilNextMs: 0,
      timeUntilNextMinutes: 0,
      timeRemaining: 0,
      manualAnalysesToday: 0,
      manualUsedToday: 0,
      manualRemaining: 10,
      dailyLimit: 10,
      lastAnalysis: null,
      nextAnalysisDue: null,
      userCreatedAt: null
    });
  }
}

/**
 * POST /api/analyze
 */
async function runManualAnalysis(req, res) {
  try {
    const userId = req.user.userId;

    console.log('🚀🚀🚀 NEW CODE RUNNING - BYPASS ACTIVE 🚀🚀🚀');
    console.log(`   User ID: ${userId}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);

    // DEBUG: Log what's in the database BEFORE analysis
    const { data: debugProducts } = await supabaseService
      .from('products')
      .select('id, title, price, cost_price, selected_for_analysis')
      .eq('user_id', userId);

    console.log('🔍 DEBUG - Products BEFORE analysis:');
    debugProducts?.forEach(p => {
      console.log(`   ${p.title}: price=${p.price}, cost_price=${p.cost_price}, selected=${p.selected_for_analysis}`);
      console.log(`   Below cost check: ${parseFloat(p.price)} <= ${parseFloat(p.cost_price)} = ${parseFloat(p.price) <= parseFloat(p.cost_price)}`);
    });

    // Check limit
    const limitCheck = await analysisService.checkManualAnalysisLimit(userId);
    if (!limitCheck.allowed) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message: `Maximum ${limitCheck.dailyLimit} manual analyses per day. Try again tomorrow.`,
        used: limitCheck.used,
        remaining: limitCheck.remaining,
        dailyLimit: limitCheck.dailyLimit
      });
    }

    // Run analysis
    const results = await analysisService.runAnalysisForUser(userId);

    // Record this manual analysis for rate limiting
    try {
      await supabaseService
        .from('manual_analyses')
        .insert({
          user_id: userId,
          triggered_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
    } catch (insertError) {
      console.warn('Failed to record manual analysis:', insertError.message);
      // Don't fail the request, just log
    }

    // DEBUG: Also include what was in DB for troubleshooting
    const debugInfo = debugProducts?.map(p => ({
      title: p.title,
      price: p.price,
      cost_price: p.cost_price,
      belowCost: parseFloat(p.price) <= parseFloat(p.cost_price || 0)
    }));

    // Log activity
    await logActivity({
      userId,
      action: ACTIONS.RUN_ANALYSIS,
      details: {
        productsAnalyzed: results.productsAnalyzed || 0,
        recommendationsCreated: results.recommendationsCreated || 0,
        manualUsed: limitCheck.used + 1,
        manualRemaining: limitCheck.remaining - 1
      }
    });

    res.json({
      success: true,
      ...results,
      manualUsed: limitCheck.used + 1,
      manualRemaining: limitCheck.remaining - 1,
      _debug: debugInfo  // Temporary debug field
    });
  } catch (error) {
    console.error('Error running analysis:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getStatus,
  runManualAnalysis
};
