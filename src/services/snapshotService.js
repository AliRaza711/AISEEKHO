const cron = require('node-cron');
const marketDataService = require('./marketDataService');

class SnapshotService {
  initialize() {
    console.log('[SnapshotService] Background tracking engine initialized.');

    // Schedules a task to run every day at midnight (00:00) standard time
    cron.schedule('0 0 * * *', async () => {
      await this.captureDailySnapshots();
    });

    // Optional: Run an immediate calculation 10 seconds after server start to seed mock testing data
    setTimeout(async () => {
      console.log('[SnapshotService] Running immediate baseline snapshot cycle...');
      await this.captureDailySnapshots();
    }, 10000);
  }

  async captureDailySnapshots() {
    try {
      console.log('\n--- STARTING DAILY SNAPSHOT ACCOUNTING CYCLE ---');
      
      // 1. Fetch all active user portfolios
      const portfoliosResult = await global.db.query('SELECT * FROM "Portfolio"');
      
      for (const portfolio of portfoliosResult.rows) {
        // 2. Fetch all current open asset positions for this user
        const positionsResult = await global.db.query(
          'SELECT * FROM "position" WHERE "portfolioId" = $1',
          [portfolio.id]
        );

        // 3. Compute real-time current valuation of all positions
        let totalAssetValue = 0;
        for (const pos of positionsResult.rows) {
          const livePrice = await marketDataService.getCurrentPrice(pos.symbol);
          totalAssetValue += pos.shares * livePrice;
        }

        const cash = parseFloat(portfolio.cashBalance);
        const exactTotalValue = cash + totalAssetValue;

        // 4. Save or Upsert snapshot entry for today
        await global.db.query(`
          INSERT INTO "HistoricalSnapshot" ("id", "portfolioId", "cashBalance", "assetValue", "totalValue", "snapshotDate")
          VALUES (md5(random()::text), $1, $2, $3, $4, CURRENT_DATE)
          ON CONFLICT ("portfolioId", "snapshotDate") DO UPDATE SET
            "cashBalance" = EXCLUDED."cashBalance",
            "assetValue" = EXCLUDED."assetValue",
            "totalValue" = EXCLUDED."totalValue"
        `, [portfolio.id, cash, totalAssetValue, exactTotalValue]);

        // 5. Keep the primary Portfolio metadata in sync
        await global.db.query(
          'UPDATE "Portfolio" SET "totalValue" = $1 WHERE id = $2',
          [exactTotalValue, portfolio.id]
        );

        console.log(`[Snapshot] Saved portfolio metrics for user ID: ${portfolio.userId} (Total Net Worth: ${exactTotalValue.toFixed(2)} PKR)`);
      }
      
      console.log('--- SNAPSHOT CYCLE COMPLETED SUCCESSFULLY ---\n');
    } catch (error) {
      console.error('[SnapshotService Error] Accounting sweep cycle aborted:', error);
    }
  }
}

module.exports = new SnapshotService();