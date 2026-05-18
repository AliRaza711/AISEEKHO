const { GoogleGenAI } = require('@google/genai');

class AIOrchestrator {
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async processMarketSignal(unstructuredInput, userId = 'auto-agent-001') {
    console.log('\n--- STARTING AGENT TRACE ---');
    console.log(`[Input Signal]: ${unstructuredInput}`);

    try {
      // ---------------------------------------------------------
      // Agent 1: Insight Extraction (Gemini 3.1 Flash)
      // ---------------------------------------------------------
      console.log('\n[Agent 1 - Insight Extraction] Analyzing input...');
      const agent1Prompt = `
      You are an expert financial data extractor for the Pakistan Stock Exchange (PSX).
      Extract key data signals from the following market news/text.
      Focus on interest rates, sector names, and specific stock tickers mentioned.
      Return the output as a concise bulleted list of facts.

      Text:
      ${unstructuredInput}
      `;

      const response1 = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: agent1Prompt,
      });
      const extractedInsights = response1.text;
      console.log('[Agent 1 Output]:\n', extractedInsights);

      // ---------------------------------------------------------
      // Agent 2: Impact Analysis (Gemini 3.1 Pro)
      // ---------------------------------------------------------
      console.log('\n[Agent 2 - Impact Analysis] Evaluating macroeconomic/structural impact...');
      const agent2Prompt = `
      You are a quantitative macro analyst for the Pakistan Stock Exchange (PSX).
      Based on the following extracted insights, evaluate the macroeconomic or structural impact on specific PSX sectors (like Technology, Banking, Cement, etc.).
      Provide a brief, targeted analysis of which sectors are likely to face tailwinds or headwinds.

      Extracted Insights:
      ${extractedInsights}
      `;

      const response2 = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: agent2Prompt,
      });
      const impactAnalysis = response2.text;
      console.log('[Agent 2 Output]:\n', impactAnalysis);

      // ---------------------------------------------------------
      // Agent 3: Action Generation & Execution Plan (Gemini 3.1 Pro)
      // ---------------------------------------------------------
      console.log('\n[Agent 3 - Action Generation] Formulating execution plan...');
      const agent3Prompt = `
      You are an autonomous PSX trading agent.
      Based on the impact analysis, determine ONE stock to trade (BUY or SELL).
      Output a structured JSON execution plan. Do not include markdown code blocks, just the raw JSON.
      Required JSON schema:
      {
        "action": "BUY" or "SELL",
        "symbol": "string (e.g., SYS, HUBC, LUCK)",
        "quantity": 100,
        "reasoning": "string (detailed reasoning for this trade based on the analysis)"
      }

      Impact Analysis:
      ${impactAnalysis}
      `;

      const response3 = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: agent3Prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const executionPlanString = response3.text;
      console.log('[Agent 3 Raw JSON Output]:\n', executionPlanString);
      
      const executionPlan = JSON.parse(executionPlanString);

      // ---------------------------------------------------------
      // Execution Phase (Hardcoded port 4000 fallback to match server.js)
      // ---------------------------------------------------------
      console.log('\n[Execution] Routing trade to core simulation API...');
      const tradePayload = {
        userId,
        action: executionPlan.action,
        symbol: executionPlan.symbol,
        quantity: parseInt(executionPlan.quantity) || 100,
        reasoning: executionPlan.reasoning
      };

      const port = process.env.PORT || 4000; 
      const apiResponse = await fetch(`http://localhost:${port}/api/trades/simulate-trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradePayload)
      });

      const tradeResult = await apiResponse.json();
      console.log('[Execution Result]:', tradeResult);
      console.log('--- END AGENT TRACE ---\n');

      return {
        insightExtraction: extractedInsights,
        impactAnalysis,
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