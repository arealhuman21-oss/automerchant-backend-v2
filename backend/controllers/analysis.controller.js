const analysisService = require('../services/analysis.service');

/**
 * GET /api/analysis/status
 */
async function getStatus(req, res) {
  try {
    const userId = req.user.id;
    const status = await analysisService.getAnalysisStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('Error getting analysis status:', error);
    res.status(500).json({ error: 'Failed to get analysis status' });
  }
}

/**
 * POST /api/analyze
 */
async function runManualAnalysis(req, res) {
  try {
    const userId = req.user.id;

    // Check limit
    const limitCheck = await analysisService.checkManualAnalysisLimit(userId);
    if (!limitCheck.allowed) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message: 'Maximum 3 manual analyses per day. Try again tomorrow.',
        used: limitCheck.used,
        remaining: limitCheck.remaining
      });
    }

    // Run analysis
    const results = await analysisService.runAnalysisForUser(userId);

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
