const config = require('./config');
const log = require('consola')
const Binance = require('node-binance-api');
const utils = require('./utils');

const binance = new Binance().options({
    APIKEY: config.api_key,
    APISECRET: config.api_secret
});

var exchangeInfo;
var prices;
var balances;

async function init(){
    preload()
    .then(() => {
        askAndBuy()
        .then(() => log.success('Completed'))
        .catch(log.error);
    })
    .catch(log.error);
}

async function preload(){
    await binance.useServerTime();
    log.info("Preloading exchangeInfo");
    exchangeInfo = await utils.loadExchangeInfo(binance);
    log.info("Preloading prices");
    prices = await binance.prices();
    log.info("Preloading balances");
    balances = await utils.loadBalances(binance);
}

async function askAndBuy(){
    var currencySymbol = await utils.ask("Currency (USDT, BTC, ...): ");
    currencySymbol = currencySymbol.toUpperCase();
    var balance = balances[currencySymbol].available;
    log.info(`${currencySymbol} balance: ${balance}`);

    var buySymbol = await utils.ask("Coin to buy: ");
    buySymbol = buySymbol.toUpperCase();
    var symbol = buySymbol+currencySymbol;
    var price = prices[symbol];
    var symbolInfo = exchangeInfo[symbol];

    // Set minimum order amount with minQty
    if ( amount < symbolInfo.minQty ) 
        amount = symbolInfo.minQty;

    // Set minimum order amount with minNotional
    if ( price * amount < symbolInfo.minNotional )
        amount = symbolInfo.minNotional / price;

    var amount = (Number(balance)*config.investment) / (Number(price) * (1+config.market_buy_inflation));

    // Round to stepSize
    amount = binance.roundStep(amount, symbolInfo.stepSize);

    await binance.marketBuy(symbol, amount);

    log.info(symbol)
    log.info(`Current Price: ${price} `)
    log.info(`${symbol} minQty: ${symbolInfo.minQty} minNotional: ${symbolInfo.minNotional} stepSize: ${symbolInfo.stepSize} `)
    log.success(`Bought ${amount}`);

    var shouldSell = await utils.ask("Sell? (type sell if you want to market sell what you bought) ");
    if(shouldSell.toUpperCase() == "SELL") {
        await binance.marketSell(symbol, amount);
        log.success(`Sold`);
        await utils.sleep(1000);
        balances = await utils.loadBalances(binance);
        var newBalance = balances[currencySymbol].available;
        log.info(`${currencySymbol} change: ${utils.toFixed(newBalance - balance)}`);
    }
}

init();