const aiOrchestrator = require('../services/aiOrchestrator');



class AnalysisController {
  static async analyzeSignal(req, res) {
    try {
      const { unstructuredInput, userId } = req.body;

      if (!unstructuredInput) {
        return res.status(400).json({ error: 'Missing required field: unstructuredInput' });
      }

      const orchestrationResult = await aiOrchestrator.processMarketSignal(unstructuredInput, userId);

      return res.status(200).json(orchestrationResult);
    } catch (error) {
      console.error('Error in analyzeSignal:', error);
      return res.status(500).json({ error: 'Internal server error during analysis', details: error.message });
    }
  }

  static async getDashboard(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId parameter' });
      }

      // Run parallel database queries
      const [portfolioResult, tradeLogsResult] = await Promise.all([
        global.db.query('SELECT * FROM "Portfolio" WHERE "userId" = $1 LIMIT 1', [userId]),
        global.db.query(`
          SELECT t.* 
          FROM "TradeLog" t 
          JOIN "Portfolio" p ON t."portfolioId" = p.id 
          WHERE p."userId" = $1 
          ORDER BY t."createdAt" DESC
        `, [userId])
      ]);

      const portfolio = portfolioResult.rows[0] || null;
      const tradeLogs = tradeLogsResult.rows || [];

      return res.status(200).json({
        portfolio,
        tradeLogs
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }
}

module.exports = { AnalysisController };
