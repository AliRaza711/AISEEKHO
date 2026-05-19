class ExecutionAgent {
  async execute(executionPlan, userId) {
    console.log('\n[ExecutionAgent] Routing trade to core simulation API...');
    const tradePayload = {
      userId,
      action: executionPlan.action,
      symbol: executionPlan.symbol,
      quantity: parseInt(executionPlan.quantity) || 100,
      reasoning: executionPlan.reasoning
    };

    const port = process.env.PORT || 3000; 
    
    try {
      const apiResponse = await fetch(`http://localhost:${port}/api/trades/simulate-trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradePayload)
      });

      const tradeResult = await apiResponse.json();
      console.log('[ExecutionAgent Result]:', tradeResult);
      return tradeResult;
    } catch (error) {
      console.error('[ExecutionAgent Error]:', error);
      throw error;
    }
  }
}

module.exports = new ExecutionAgent();
