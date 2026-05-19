const express = require('express');
const { AnalysisController } = require('../controllers/analysisController');

const router = express.Router();

// 1. Core multi-agent execution endpoint
router.post('/analyze-signal', AnalysisController.analyzeSignal);

// 2. Clear, singular unified dashboard endpoint
router.get('/dashboard/:userId', AnalysisController.getDashboard);

// 3. Live portfolio prices endpoint (bypasses AI)
router.get('/live-prices/:userId', AnalysisController.getLivePortfolioPrices);

module.exports = router;