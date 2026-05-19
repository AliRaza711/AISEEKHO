const aiOrchestrator = require('../services/aiOrchestrator');
const marketDataService = require('../services/marketDataService');

class AnalysisController {
  static async analyzeSignal(req, res) {
    try {
      console.log("[Controller Route Hit] Processing Payload:", req.body); // <-- Added a tracker

      const { unstructuredInput, documentUrl, userId } = req.body;

      if (!unstructuredInput && !documentUrl) {
        return res.status(400).json({
          error: 'Missing input: You must provide either unstructuredInput or a documentUrl.'
        });
      }

      // Pass both parameters down to the orchestrator
      const orchestrationResult = await aiOrchestrator.processMarketSignal(
        unstructuredInput,
        documentUrl,
        userId
      );

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

      // 1. Fetch current portfolio (WITHOUT nesting positions)
      let portfolio = await global.prisma.portfolio.findUnique({
        where: { userId }
      });

      // FIX 1: Self-Healing Onboarding for new users
      if (!portfolio) {
        console.log(`[Dashboard] Onboarding new user: ${userId}`);
        portfolio = await global.prisma.portfolio.create({
          data: {
            userId,
            cashBalance: 1000000,
            totalValue: 1000000,
            riskScore: 0.5
          }
        });
      }

      // 2. Fetch all required arrays completely flat and separate
      const positions = await global.prisma.position.findMany({
        where: { portfolioId: portfolio.id },
        orderBy: { symbol: 'asc' }
      });

      const tradeLogs = await global.prisma.tradeLog.findMany({
        where: { portfolioId: portfolio.id },
        orderBy: { createdAt: 'desc' }
      });

      // FIX 2: Missing History Array for the Mobile Charts
      const history = await global.prisma.historicalSnapshot.findMany({
        where: { portfolioId: portfolio.id },
        orderBy: { snapshotDate: 'asc' }
      });

      const analysisTraces = await global.prisma.analysisTrace.findMany({
        where: { portfolioId: portfolio.id },
        orderBy: { createdAt: 'desc' }
      });

      // 3. Return the exact flat structure promised to the mobile team
      return res.status(200).json({
        portfolio,
        positions,
        tradeLogs,
        history,
        analysisTraces
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }
  static async getLivePortfolioPrices(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId parameter' });
      }

      const portfolio = await global.prisma.portfolio.findUnique({
        where: { userId },
        include: { positions: true }
      });

      if (!portfolio || !portfolio.positions || portfolio.positions.length === 0) {
        return res.status(200).json([]);
      }

      const symbols = [...new Set(portfolio.positions.map(p => p.symbol))];

      const livePrices = await Promise.all(
        symbols.map(async (symbol) => {
          const livePrice = await marketDataService.getCurrentPrice(symbol);
          return { symbol, livePrice };
        })
      );

      return res.status(200).json(livePrices);
    } catch (error) {
      console.error('Error fetching live portfolio prices:', error);
      return res.status(500).json({ error: 'Internal server error fetching live prices', details: error.message });
    }
  }
}

module.exports = { AnalysisController };
