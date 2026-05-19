const axios = require('axios');

class MarketDataService {
  async getCurrentPrice(symbol) {
    const ticker = symbol.toUpperCase();
    const apiKey = 'f5f28f279ac24107861e47dcb027e131';
    
    // Note the "&exchange=XKAR" - This forces it to pull from the Karachi Stock Exchange
    const url = `https://api.twelvedata.com/price?symbol=${ticker}&exchange=XKAR&apikey=${apiKey}`;

    try {
      const response = await axios.get(url);
      
      if (response.data && response.data.price) {
        const livePrice = parseFloat(response.data.price);
        console.log(`[MarketDataService] 🟢 TWELVE DATA API (XKAR) fetched for ${ticker}: ${livePrice} PKR`);
        return livePrice;
      }
      
      throw new Error("API did not return a valid price.");

    } catch (error) {
      console.warn(`[MarketDataService] 🔴 API failed for ${ticker}. Using fallback.`);
      return 150.00; 
    }
  }
}

module.exports = new MarketDataService();