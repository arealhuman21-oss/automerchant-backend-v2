const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const analysisController = require('../controllers/analysis.controller');

// GET /api/analysis/status
router.get('/status', authenticateToken, analysisController.getStatus);

// POST /api/analyze
router.post('/', authenticateToken, analysisController.runManualAnalysis);

module.exports = router;
