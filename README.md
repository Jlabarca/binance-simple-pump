# Binance simple pump
Simple node.js app for faster buy and sell using binance API

## Usage
Run it before the pump because it takes some seconds preloading info, prices and balances: 
- Input currency and coin to buy (you could left that last input waiting until the pump is announced)
- After that the purchase is inmediatlly made as a market buy
- Then you can market sell the same a mount typing "sell"

## Requirements

* Node 8

#### Install dependencies
```bash
npm install
```

#### Configuration

Create a binance API key
https://www.binance.com/en/my/settings/api-management
Fill config.js:
```js
let config = {
  api_key: 'YOUR-API-KEY',
  api_secret: 'YOUR-API-SECRET',
  ...
};
```

There you also can set this two values as desired
```js
let config = {
    ...
    market_buy_inflation: .2, // This is to make sure your buy order gets in. Sets the market buy to current price + inflation percentage
    max_buy_inflation: 1, // panic sell if you bought it with over 100% inflation
    investment: .1, // will buy using 10% of your balance
    limitSell: .2 // creates a limit sell at 20% of profit after buying
};
```


#### Run app
```c
//Regular buy and sell
node binance-simple-pump.js  

//Only selling 
node binance-simple-pump.js -sell

//Convert all your coins to a specific one
node binance-simple-pump.js -sellall
```
