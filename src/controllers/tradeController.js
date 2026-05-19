const marketDataService = require('../services/marketDataService');

class TradeController {
  static async executeTrade(req, res) {
    try {
      const { userId, action, symbol, quantity, reasoning } = req.body;
      const ticker = symbol.toUpperCase();
      const qty = parseInt(quantity);

      if (!userId || !action || !ticker || !qty) {
        return res.status(400).json({ error: 'Missing execution primitives.' });
      }

      // 1. Fetch real-time market price dynamically from our service
      const currentPrice = await marketDataService.getCurrentPrice(ticker);
      const transactionValue = qty * currentPrice;

      // 2. Fetch or initialize the user's Portfolio via Prisma
      let portfolio = await global.prisma.portfolio.findUnique({
        where: { userId },
        include: { positions: true }
      });

      if (!portfolio) {
        portfolio = await global.prisma.portfolio.create({
          data: {
            userId,
            cashBalance: 1000000,
            totalValue: 1000000,
            riskScore: 0.5
          },
          include: { positions: true }
        });
      }

      const previousCashBalance = portfolio.cashBalance;
      const previousTotalValue = portfolio.totalValue;
      let newCashBalance = previousCashBalance;

      // 3. Process Transaction Execution Logic
      if (action.toUpperCase() === 'BUY') {
        if (newCashBalance < transactionValue) {
          return res.status(400).json({ error: 'Insufficient cash liquidity to execute trade payload.' });
        }
        newCashBalance -= transactionValue;

        // Upsert Position
        const existingPosition = portfolio.positions.find(p => p.symbol === ticker);
        if (existingPosition) {
           const newShares = existingPosition.shares + qty;
           const newAvgPrice = ((existingPosition.shares * existingPosition.averagePrice) + transactionValue) / newShares;
           
           await global.prisma.position.update({
             where: { id: existingPosition.id },
             data: { shares: newShares, averagePrice: newAvgPrice, updatedAt: new Date() }
           });
        } else {
           await global.prisma.position.create({
             data: {
               portfolioId: portfolio.id,
               symbol: ticker,
               shares: qty,
               averagePrice: currentPrice
             }
           });
        }

      } else if (action.toUpperCase() === 'SELL') {
        const existingPosition = portfolio.positions.find(p => p.symbol === ticker);

        if (!existingPosition || existingPosition.shares < qty) {
          return res.status(400).json({ error: `Insufficient inventory. Cannot SELL ${qty} shares of ${ticker}.` });
        }

        newCashBalance += transactionValue;

        if (existingPosition.shares === qty) {
          await global.prisma.position.delete({ where: { id: existingPosition.id } });
        } else {
          await global.prisma.position.update({
            where: { id: existingPosition.id },
            data: { shares: existingPosition.shares - qty, updatedAt: new Date() }
          });
        }
      } else {
        return res.status(400).json({ error: 'Invalid operation directive. Action must be BUY or SELL.' });
      }

      // 4. Compute Real-time Mark-to-Market Valuation
      const updatedPositions = await global.prisma.position.findMany({ where: { portfolioId: portfolio.id } });
      let totalAssetValue = 0;
      
      for (const pos of updatedPositions) {
        const livePrice = await marketDataService.getCurrentPrice(pos.symbol);
        totalAssetValue += pos.shares * livePrice;
      }
      
      const newTotalValue = newCashBalance + totalAssetValue;

      // 5. Update Portfolio Cash Balances & Total Value
      const finalPortfolioUpdate = await global.prisma.portfolio.update({
        where: { id: portfolio.id },
        data: {
          cashBalance: newCashBalance,
          totalValue: newTotalValue
        }
      });

      // 6. Log Transaction to TradeLog History with Before/After State
      const executedLog = await global.prisma.tradeLog.create({
        data: {
          portfolioId: portfolio.id,
          action: action.toUpperCase(),
          symbol: ticker,
          quantity: qty,
          price: currentPrice,
          reasoning: reasoning || '',
          previousCashBalance,
          newCashBalance,
          previousTotalValue,
          newTotalValue
        }
      });

      return res.status(200).json({
        message: 'Transaction successfully processed and asset ledger adjusted.',
        portfolio: finalPortfolioUpdate,
        positions: updatedPositions,
        executedLog
      });

    } catch (error) {
      console.error('Core Transaction Failure:', error);
      return res.status(500).json({ error: 'Internal transaction state failure.', details: error.message });
    }
  }
}

module.exports = { TradeController };