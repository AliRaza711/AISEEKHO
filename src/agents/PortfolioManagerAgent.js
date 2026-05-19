const { GoogleGenAI } = require('@google/genai');

class PortfolioManagerAgent {
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async generateAction(impactAnalysis, portfolioState) {
    console.log('\n[PortfolioManagerAgent] Formulating execution plan based on portfolio state...');
    
    const agent3Prompt = `
      You are an autonomous PSX trading agent.
      Based on the impact analysis and the current user portfolio state, determine ONE stock to trade (BUY or SELL).
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
      
      Current Portfolio State:
      ${JSON.stringify(portfolioState, null, 2)}
    `;

    const response3 = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: agent3Prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const executionPlanString = response3.text;
    console.log('[PortfolioManagerAgent Raw JSON Output]:\n', executionPlanString);
    
    return JSON.parse(executionPlanString);
  }
}

module.exports = new PortfolioManagerAgent();
