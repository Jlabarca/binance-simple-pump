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
    let arg1 = process.argv[2].toLowerCase();
    if(arg1 == "-sellall")
        preload(true, false)
        .then(() => {
            askAndSellAll()
            .then(() => log.success('Completed'))
            .catch(log.error);
        })
        .catch(log.error);
    else if(arg1 == "-sell")
        preload(true, false)
        .then(() => {
            askAndSell()
            .then(() => log.success('Completed'))
            .catch(log.error);
        })
        .catch(log.error);
    else
        preload()
        .then(() => {
            askAndBuy()
            .then(() => log.success('Completed'))
            .catch(log.error);
        })
        .catch(log.error);
}

async function preload(extractExchangeInfo = true, extractPrices = true){
    await binance.useServerTime();
    if(extractExchangeInfo) {
        log.info("Preloading exchangeInfo");
        exchangeInfo = await utils.loadExchangeInfo(binance);
    }

    if(extractPrices) {
        log.info("Preloading prices");
        prices = await binance.prices();
    }
    
    log.info("Preloading balances");
    balances = await utils.loadBalances(binance);
}

async function askAndBuy(){
    var currencySymbol = await utils.ask("Currency (USDT, BTC, ...): ");
    currencySymbol = currencySymbol.toUpperCase().trim();
    var balance = balances[currencySymbol].available;
    log.info(`${currencySymbol} balance: ${balance}`);
    do {
        var buySymbol = await utils.ask("Coin to buy: ");
        buySymbol = buySymbol.toUpperCase().trim();
    } while (buySymbol  === "");

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

    var marketBuy = await binance.marketBuy(symbol, amount);
    var boughtPrice = marketBuy.fills[0].price;
    var expectedInflation = (100 - (boughtPrice * 100 / price)).toFixed(2);

    log.info(symbol)
    log.info(`Current Price: ${boughtPrice} -  ${expectedInflation}% more than expected`)
    if(expectedInflation > config.max_buy_inflation){
        panicSell(symbol, amount, currencySymbol, balance);
        return;
    }

    log.info(`${symbol} minQty: ${symbolInfo.minQty} minNotional: ${symbolInfo.minNotional} stepSize: ${symbolInfo.stepSize} `)
    log.success(`Bought ${amount} at ${boughtPrice}`);

    var priceDecimals = utils.countDecimals(boughtPrice);
    var limitSellPrice = (boughtPrice * (1+config.limitSell)).toFixed(priceDecimals);
    log.success(`Setting limit sell at ${limitSellPrice}`);
    var sell = await binance.sell(symbol, amount, limitSellPrice); 

    var shouldSell = await utils.ask("Panic Sell? (type sell if you want to market sell what you bought) ");
    if(shouldSell.toUpperCase().trim() == "SELL") {
        // await binance.cancel(symbol, sell.orderId, (error, response, symbol) => {
        //     log.info(symbol+" cancel response:", response);
        // });
        await binance.cancelAll(symbol)
        panicSell(symbol, amount, currencySymbol, balance);
    }
}

async function panicSell(symbol, amount, currencySymbol, balance) {
    log.info(`Panic SELL`);
    await binance.marketSell(symbol, amount);
    log.success(`Sold`);
    await utils.sleep(1000);
    balances = await utils.loadBalances(binance);
    var newBalance = balances[currencySymbol].available;
    log.info(`${currencySymbol} change: ${utils.toFixed(newBalance - balance)}`);
}

async function askAndSell(){
    var currencySymbol = await utils.ask("Currency (USDT, BTC, ...): ");
    currencySymbol = currencySymbol.toUpperCase();
    var coinSymbol = await utils.ask("Coin to Sell: ");
    coinSymbol = coinSymbol.toUpperCase().trim();
    var balance = balances[coinSymbol].available;

    log.info(`${coinSymbol} balance: ${balance}`);

    var shouldSell = await utils.ask("Sell? (type sell if you want to market sell what you bought) ");
    var symbol = coinSymbol+currencySymbol;
    var amount = binance.roundStep(amount, symbolInfo.stepSize);

    if(shouldSell.toUpperCase() == "SELL") {
        await binance.marketSell(symbol, amount);
        log.success(`Sold`);
    }
}

async function askAndSellAll(){
    var currencySymbol = await utils.ask("Currency (USDT, BTC, ...): ");
    currencySymbol = currencySymbol.toUpperCase().trim();
    Object.keys(balances).forEach(async coinSymbol => {
        if(coinSymbol === currencySymbol) return;
        if(coinSymbol === 'BNB') return;

        let element = balances[coinSymbol];
        try {
            var balance = Number(element.available);
            if(balance == 0) return;
            log.info(`${coinSymbol} balance: ${balance}`);
            var symbol = coinSymbol+currencySymbol;
            var symbolInfo = exchangeInfo[symbol];
            var amount = binance.roundStep(balance, symbolInfo.stepSize);
            await binance.marketSell(symbol, amount);
            log.success(`Sold`);
        } catch (error) {
            if(coinSymbol === 'BTC')
                log.error(error)
        }
    });
}

init();