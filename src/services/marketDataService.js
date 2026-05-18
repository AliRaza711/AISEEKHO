class MarketDataService {
  // Simulates fetching real-time market data from the PSX board
  async getCurrentPrice(symbol) {
    const ticker = symbol.toUpperCase();
    
    // Baseline realistic trading prices for key PSX equities in PKR
    const basePrices = {
      SYS: 465.50,
      HUBC: 122.30,
      LUCK: 680.15,
      ENGRO: 310.40,
      OGDC: 145.20
    };

    const basePrice = basePrices[ticker] || 150.00;
    
    // Add a minor random micro-fluctuation (-1% to +1%) to simulate a live ticker ticker
    const fluctuation = 1 + (Math.random() * 0.02 - 0.01);
    const livePrice = parseFloat((basePrice * fluctuation).toFixed(2));

    console.log(`[MarketDataService] Fetched live PSX quote for ${ticker}: ${livePrice} PKR`);
    return livePrice;
  }
}

module.exports = new MarketDataService();