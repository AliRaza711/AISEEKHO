const { GoogleGenAI } = require('@google/genai');

class MarketAnalystAgent {
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async analyze(executionContext) {
    const { unstructuredInput, documentUrl } = executionContext;
    console.log('\n[MarketAnalystAgent] Starting analysis...');
    
    // Step 1: Insight Extraction
    const agent1Prompt = `
      You are an expert financial data extractor for the Pakistan Stock Exchange (PSX).
      Extract key data signals from the following market news/text or document URL.
      Focus on interest rates, sector names, and specific stock tickers mentioned.
      Return the output as a concise bulleted list of facts.

      Text:
      ${unstructuredInput || ''}
      
      Document URL:
      ${documentUrl || ''}
    `;

    const response1 = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: agent1Prompt,
    });
    const extractedInsights = response1.text;
    console.log('[MarketAnalystAgent - Extracted Insights]:\n', extractedInsights);

    // Step 2: Impact Analysis
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
    console.log('[MarketAnalystAgent - Impact Analysis]:\n', impactAnalysis);

    return {
      extractedInsights,
      impactAnalysis
    };
  }
}

module.exports = new MarketAnalystAgent();
