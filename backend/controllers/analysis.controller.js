const analysisService = require('../services/analysis.service');
const { supabaseService } = require('../config/database');

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

    res.json({
      success: true,
      ...results,
      manualUsed: limitCheck.used + 1,
      manualRemaining: limitCheck.remaining - 1
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
