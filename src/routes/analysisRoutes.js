const express = require('express');
const { AnalysisController } = require('../controllers/analysisController');

const router = express.Router();

// 1. Core multi-agent execution endpoint
router.post('/analyze-signal', AnalysisController.analyzeSignal);

// 2. Clear, singular unified dashboard endpoint
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Fetch current portfolio stats
    let portfolioResult = await global.db.query(
      'SELECT * FROM "Portfolio" WHERE "userId" = $1 LIMIT 1',
      [userId]
    );
    let portfolio = portfolioResult.rows[0];

    // If user is new, automatically initialize their portfolio
    if (!portfolio) {
      console.log(`[Dashboard] Onboarding new user: ${userId}`);
      const createResult = await global.db.query(
        'INSERT INTO "Portfolio" (id, "userId", "cashBalance", "totalValue", "riskScore") VALUES (md5(random()::text), $1, 1000000, 1000000, 0.5) RETURNING *',
        [userId]
      );
      portfolio = createResult.rows[0];
    }

    // 2. Fetch all currently open stock asset positions
    const positionsResult = await global.db.query(
      'SELECT * FROM "position" WHERE "portfolioId" = $1 ORDER BY symbol ASC',
      [portfolio.id]
    );

    // 3. Fetch full historical transaction logs
    const logsResult = await global.db.query(
      'SELECT * FROM "TradeLog" WHERE "portfolioId" = $1 ORDER BY "createdAt" DESC',
      [portfolio.id]
    );

    // 4. Fetch historical chart performance entries
    const snapshotsResult = await global.db.query(
      'SELECT "snapshotDate", "totalValue", "cashBalance", "assetValue" FROM "HistoricalSnapshot" WHERE "portfolioId" = $1 ORDER BY "snapshotDate" ASC',
      [portfolio.id]
    );

    // Return all four structured dataset keys cleanly
    return res.status(200).json({
      portfolio,
      positions: positionsResult.rows,
      tradeLogs: logsResult.rows,
      history: snapshotsResult.rows
    });

  } catch (error) {
    console.error('Error compiling dashboard state:', error);
    return res.status(500).json({ error: 'Internal failure compiling user data metrics.', details: error.message });
  }
});

module.exports = router;