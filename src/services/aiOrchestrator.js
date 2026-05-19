const MarketAnalystAgent = require('../agents/MarketAnalystAgent');
const PortfolioManagerAgent = require('../agents/PortfolioManagerAgent');
const ExecutionAgent = require('../agents/ExecutionAgent');

class AIOrchestrator {
  async processMarketSignal(unstructuredInput, documentUrl, userId = 'auto-agent-001') {
    console.log('\n--- STARTING AGENT TRACE ---');
    console.log(`[Input Signal]: ${unstructuredInput} | [URL]: ${documentUrl}`);

    try {
      // 1. Content Understanding & Insight Extraction & Impact Analysis
      // Triggering 'market-extractor' skill via agent/SDK with execution context payload
      const executionContext = {
        unstructuredInput,
        documentUrl
      };
      const analysisResult = await MarketAnalystAgent.analyze(executionContext);
      
      // Fetch user portfolio state
      let portfolio = await global.prisma.portfolio.findUnique({
        where: { userId },
        include: { positions: true }
      });

      if (!portfolio) {
        // If no portfolio exists, mock an empty state for the agent
        portfolio = {
          userId,
          cashBalance: 1000000,
          totalValue: 1000000,
          positions: []
        };
      }

      // 2. Action Generation based on Portfolio
      const executionPlan = await PortfolioManagerAgent.generateAction(
        analysisResult.impactAnalysis,
        portfolio
      );

      // 3. Execution Simulation
      const tradeResult = await ExecutionAgent.execute(executionPlan, userId);

      // 4. Save Trace to Database
      let traceRecord = null;
      const finalPortfolioId = portfolio.id || (tradeResult.portfolio && tradeResult.portfolio.id);
      
      if (finalPortfolioId) {
         traceRecord = await global.prisma.analysisTrace.create({
            data: {
              portfolioId: finalPortfolioId,
              // FIX: Give Prisma a fallback string if unstructuredInput is empty!
              unstructuredInput: unstructuredInput || `[Scraped from URL]: ${documentUrl}`,
              extractedInsights: analysisResult.extractedInsights,
              impactAnalysis: analysisResult.impactAnalysis,
              executionPlan,
              // Note: Make sure tradeResult is actually in your schema.prisma, 
              // otherwise remove this line if it throws another error.
              tradeResult 
            }
          });
      }

      console.log('--- END AGENT TRACE ---\n');

      return {
        traceId: traceRecord ? traceRecord.id : null,
        insightExtraction: analysisResult.extractedInsights,
        impactAnalysis: analysisResult.impactAnalysis,
        executionPlan,
        tradeResult
      };

    } catch (error) {
      console.error('[Agent Pipeline Error]:', error);
      throw error;
    }
  }
}

module.exports = new AIOrchestrator();