let config = {
  api_key: 'YOUR-API-KEY',
  api_secret: 'YOUR-API-SECRET',
  market_buy_inflation: .14, // This is to make sure your buy order gets in. Sets the market buy to current price + inflation percentage
  investment: .1 // will buy using 10% of your balance
  market_buy_inflation: .2, // This is to make sure your buy order gets in. Sets the market buy to current price + inflation percentage
  max_buy_inflation: 1, // panic sell if you bought it with over 100% inflation
  limitSell: .2 // limit sell at 25% of gains
};

module.exports = config;