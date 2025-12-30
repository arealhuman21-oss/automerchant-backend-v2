const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const analysisController = require('../controllers/analysis.controller');

// GET /api/analysis/status
router.get('/status', authenticateToken, analysisController.getStatus);

// POST /api/analysis - Run manual analysis
router.post('/', authenticateToken, analysisController.runManualAnalysis);

// GET /api/analysis - Fallback for form submissions (also runs analysis)
// This handles cases where browser makes GET instead of POST
router.get('/', authenticateToken, analysisController.runManualAnalysis);

module.exports = router;
