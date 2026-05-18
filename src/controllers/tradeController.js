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

      // 2. Fetch or initialize the user's Portfolio
      let portfolioResult = await global.db.query(
        'SELECT * FROM "Portfolio" WHERE "userId" = $1 LIMIT 1',
        [userId]
      );
      let portfolio = portfolioResult.rows[0];

      if (!portfolio) {
        const createResult = await global.db.query(
          'INSERT INTO "Portfolio" (id, "userId", "cashBalance", "totalValue", "riskScore") VALUES (md5(random()::text), $1, 1000000, 1000000, 0.5) RETURNING *',
          [userId]
        );
        portfolio = createResult.rows[0];
      }

      let newCashBalance = parseFloat(portfolio.cashBalance);

      // 3. Process Transaction Execution Logic
      if (action.toUpperCase() === 'BUY') {
        if (newCashBalance < transactionValue) {
          return res.status(400).json({ error: 'Insufficient cash liquidity to execute trade payload.' });
        }
        newCashBalance -= transactionValue;

        // Upsert Position using text-based random IDs
        await global.db.query(`
          INSERT INTO "position" (id, "portfolioId", symbol, shares, "averagePrice", "updatedAt")
          VALUES (md5(random()::text), $1, $2, $3, $4, NOW())
          ON CONFLICT ("portfolioId", symbol) DO UPDATE SET
            "averagePrice" = (("position".shares * "position"."averagePrice") + $5) / ("position".shares + $3),
            shares = "position".shares + $3,
            "updatedAt" = NOW()
        `, [portfolio.id, ticker, qty, currentPrice, transactionValue]);

      } else if (action.toUpperCase() === 'SELL') {
        const positionResult = await global.db.query(
          'SELECT * FROM "position" WHERE "portfolioId" = $1 AND symbol = $2',
          [portfolio.id, ticker]
        );
        const currentPosition = positionResult.rows[0];

        if (!currentPosition || currentPosition.shares < qty) {
          return res.status(400).json({ error: `Insufficient inventory. Cannot SELL ${qty} shares of ${ticker}.` });
        }

        newCashBalance += transactionValue;

        if (currentPosition.shares === qty) {
          await global.db.query('DELETE FROM "position" WHERE id = $1', [currentPosition.id]);
        } else {
          await global.db.query(
            'UPDATE "position" SET shares = shares - $1, "updatedAt" = NOW() WHERE id = $2',
            [qty, currentPosition.id]
          );
        }
      } else {
        return res.status(400).json({ error: 'Invalid operation directive. Action must be BUY or SELL.' });
      }

      // 4. Update Portfolio Cash Balances
      await global.db.query(
        'UPDATE "Portfolio" SET "cashBalance" = $1 WHERE id = $2',
        [newCashBalance, portfolio.id]
      );

      // 5. Log Transaction to TradeLog History using text ID logic
      const logResult = await global.db.query(
        'INSERT INTO "TradeLog" (id, "portfolioId", action, symbol, quantity, price, reasoning, "createdAt") VALUES (md5(random()::text), $1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
        [portfolio.id, action.toUpperCase(), ticker, qty, currentPrice, reasoning || '']
      );

      // 6. Compute Real-time Mark-to-Market Valuation
      const positionsSummary = await global.db.query('SELECT * FROM "position" WHERE "portfolioId" = $1', [portfolio.id]);
      let totalAssetValue = 0;
      
      for (const pos of positionsSummary.rows) {
        const livePrice = await marketDataService.getCurrentPrice(pos.symbol);
        totalAssetValue += pos.shares * livePrice;
      }
      
      const newTotalPortfolioValue = newCashBalance + totalAssetValue;
      
      const finalPortfolioUpdate = await global.db.query(
        'UPDATE "Portfolio" SET "totalValue" = $1 WHERE id = $2 RETURNING *',
        [newTotalPortfolioValue, portfolio.id]
      );

      return res.status(200).json({
        message: 'Transaction successfully processed and asset ledger adjusted.',
        portfolio: finalPortfolioUpdate.rows[0],
        positions: positionsSummary.rows,
        executedLog: logResult.rows[0]
      });

    } catch (error) {
      console.error('Core Transaction Failure:', error);
      return res.status(500).json({ error: 'Internal transaction state failure.', details: error.message });
    }
  }
}

module.exports = { TradeController };