const express = require('express');
const { TradeController } = require('../controllers/tradeController');

const router = express.Router();

router.post('/simulate-trade', TradeController.executeTrade);

module.exports = router;
