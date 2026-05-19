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
      
      // 1. Fetch all active user portfolios with positions
      const portfolios = await global.prisma.portfolio.findMany({
        include: { positions: true }
      });
      
      const today = new Date();
      today.setUTCHours(0,0,0,0);

      for (const portfolio of portfolios) {
        // 2. Compute real-time current valuation of all positions
        let totalAssetValue = 0;
        for (const pos of portfolio.positions) {
          const livePrice = await marketDataService.getCurrentPrice(pos.symbol);
          totalAssetValue += pos.shares * livePrice;
        }

        const cash = portfolio.cashBalance;
        const exactTotalValue = cash + totalAssetValue;

        // 3. Save or Upsert snapshot entry for today
        const existingSnapshot = await global.prisma.historicalSnapshot.findUnique({
          where: {
            portfolioId_snapshotDate: {
              portfolioId: portfolio.id,
              snapshotDate: today
            }
          }
        });

        if (existingSnapshot) {
          await global.prisma.historicalSnapshot.update({
            where: { id: existingSnapshot.id },
            data: {
              cashBalance: cash,
              assetValue: totalAssetValue,
              totalValue: exactTotalValue
            }
          });
        } else {
          await global.prisma.historicalSnapshot.create({
            data: {
              portfolioId: portfolio.id,
              cashBalance: cash,
              assetValue: totalAssetValue,
              totalValue: exactTotalValue,
              snapshotDate: today
            }
          });
        }

        // 4. Keep the primary Portfolio metadata in sync
        await global.prisma.portfolio.update({
          where: { id: portfolio.id },
          data: { totalValue: exactTotalValue }
        });

        console.log(`[Snapshot] Saved portfolio metrics for user ID: ${portfolio.userId} (Total Net Worth: ${exactTotalValue.toFixed(2)} PKR)`);
      }
      
      console.log('--- SNAPSHOT CYCLE COMPLETED SUCCESSFULLY ---\n');
    } catch (error) {
      console.error('[SnapshotService Error] Accounting sweep cycle aborted:', error);
    }
  }
}

module.exports = new SnapshotService();