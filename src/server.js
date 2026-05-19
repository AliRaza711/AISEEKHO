require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const snapshotService = require('./services/snapshotService');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

// Initialize PostgreSQL Pool using your Neon connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for cloud providers like Neon
});

global.db = pool;

// Initialize Prisma Client with pg adapter
const adapter = new PrismaPg(pool);
global.prisma = new PrismaClient({ adapter });

// Add this right after global.db = new Pool({...}) inside src/server.js
// const initDb = async () => {
//   try {
//     // Create Position table if it doesn't exist
//     await global.db.query(`
//       CREATE TABLE IF NOT EXISTS "Position" (
//         "id" UUID PRIMARY KEY,
//         "portfolioId" UUID NOT NULL REFERENCES "Portfolio"("id") ON DELETE CASCADE,
//         "symbol" VARCHAR(10) NOT NULL,
//         "shares" INTEGER NOT NULL DEFAULT 0,
//         "averagePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
//         "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
//         CONSTRAINT unique_portfolio_symbol UNIQUE ("portfolioId", "symbol")
//       );
//     `);
//     console.log("Database schema extensions verified successfully.");
//   } catch (err) {
//     console.error("Error extending database schema:", err);
//   }
// };
// initDb();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const tradeRoutes = require('./routes/tradeRoutes');
const analysisRoutes = require('./routes/analysisRoutes');

app.use('/api/trades', tradeRoutes);
app.use('/api/analysis', analysisRoutes);

// Health check endpoint using raw SQL pool
app.get('/health', async (req, res) => {
  try {
    const result = await global.db.query('SELECT NOW()');
    res.status(200).json({ status: 'ok', db: 'connected', time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'disconnected', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running beautifully on port ${port}`);

  snapshotService.initialize();
});