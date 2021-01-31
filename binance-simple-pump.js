const config = require('./config');
const log = require('consola')
const Binance = require('node-binance-api');
const utils = require('./utils');

const binance = new Binance().options({
    APIKEY: config.api_key,
    APISECRET: config.api_secret
});

var prices;
var balances;

async function init(){
    preload()
    .then(() => {
        askAndBuy()
        .then(() => log.info('Completed'))
        .catch(log.error);
    })
    .catch(log.error);
}

async function preload(){
    await binance.useServerTime();
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
    log.info(symbol)
    log.info(`Current Price: ${price}`)

    var amount = Math.floor((balance*config.investment) / (price * 1+config.market_buy_inflation));
    log.info(`Buying ${amount}`);
    await binance.marketBuy(symbol, amount);
}

init();