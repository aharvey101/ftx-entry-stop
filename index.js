#!usr/bin/env node
const CCXT = require('ccxt');
const FTXWS = require('ftx-api-ws')
require('dotenv').config()

const ftxccxt = new CCXT.ftx({ apiKey: process.env.API_KEY, secret: process.env.API_SECRET })
const ftxWs = new FTXWS({ apiKey: process.env.API_KEY, secret: process.env.API_SECRET })

const { argv } = require("yargs")
  .example(
    "node index.js -p ETH-PERP -a 1 -e 150 -s 125",
    "Place a buy order for 1 ETH @ $150. If order is filled, places stop at $125. If stop is breached prior to entry order fill, cancels entry order, terminates and exits."
  )
  // '-p <tradingPair>'
  .demand("p")
  .alias("p", "pair")
  .describe("p", "Set trading pair eg. BNBBTC")
  // '-a <amount>'
  .demand("a")
  .number("a")
  .alias("a", "amount")
  .describe("a", "Set amount to buy/sell")
  // 'e <entryPrice>
  .demand('e')
  .number('e')
  .alias('e', 'entry-price')
  .describe('e', 'Set Entry Price')
  // '-s <stopPrice>'
  .number("s")
  .alias("s", "stop-price")
  .describe("s", "Set stop-limit order stop price")
  // '-tf <timeframe>'
  .demand('tf')
  .alias('tf', 'timeframe')
  .describe('tf', 'Sets the timeframe')

const {
  p: pair,
  a: amount,
  e: entryPrice,
  s: stopPrice,
  tf: timeframe
} = argv;
console.log(argv)
let isShort = entryPrice < stopPrice;

let entrySide,
  entryType,
  entryTriggerPrice,
  ccxtOverride,
  stopSide,
  stopType,
  cancelPrice,
  alreadyOrdered = false

if (isShort) {
  console.log('position is short')
  // Short entry Paramaters
  entrySide = "sell";
  entryType = 'market';
  entryTriggerPrice = (entryPrice + 0.01)
  // ccxt short override
  ccxtOverride = {
    'orderPrice': entryTriggerPrice,
  }
  // Short exit paramaters
  stopSide = 'buy'
  stopType = 'stop'
  cancelPrice = (stopPrice - 0.01)
  ccxtstopOverride = {
    'orderPrice': stopPrice,
    'reduceOnly': true
  }
  // Order Mangement Rule 1 paramaters:
  orderParams = {
    'reduceOnly': true
  }
} else if (!isShort) {

  // Long entry Paramaters
  entrySide = 'buy'
  entryType = 'limit' //stop limit, so use a conditional order with a trigger price
  entryTriggerPrice = (entryPrice + 0.01)
  // ccxt short override
  ccxtOverride = {
    'orderPrice': entryPrice
  }
  //Long stop paramaters
  stopSide = 'sell'
  stopType = 'stop'
  cancelPrice = (stopPrice + 0.01)
  ccxtstopOverride = {
    'orderPrice': stopPrice
  }
  // Order Mangement Rule 1 paramaters:
  orderParams = {
    'reduceOnly': true
  }
}



console.log(isShort)

let om1e = false;
go()
async function go() {
  await ftxWs.connect()
    .catch(err => console.log(err))
  let since = Date.now()
  let gotCandles = []
  await ftxccxt.createOrder(pair, entryType, entrySide, amount, entryPrice, ccxtOverride)
    .then((order) => {
      console.log(order)
    })
    .catch(err => console.log('Error posting entry: ' + err))
  await ftxWs.subscribe('ticker', pair);
  ftxWs.on(`${pair}::ticker`, function (res) {
    ftxccxt.fetchOHLCV('BTC-PERP', timeframe, since, limit = undefined, params = {})
      .then(candles => {
        gotCandles = candles
      })

    ticker = res
    console.log(ticker.last)
    // if stop breached
    if (
      //Short stop breach
      (isShort && ticker.last > stopPrice) ||
      //Long stop breach
      (!isShort && ticker.last < stopPrice)
    ) {
      // NEEDS TESTING
      // Get last order and cancel 
      ftxccxt.fetchOpenOrders(pair, since, 1)
        .catch(err => console.log('Error getting order for cancel' + err))
        //cancel order
        .then(order => {
          console.log('Stop has been breached prior to entry,Cancelling orders and exiting ')
          ftxccxt.cancelOrder(order[0].id)
          ftxWs.terminate()
          process.exit()
        })
    }
    // UNIT TEST
    // if price goes through entry
    if (
      //if long
      (entryPrice > stopPrice && ticker.last >= entryPrice)
      //if short
      || (entryPrice < stopPrice && ticker.last <= entryPrice)
    ) {
      //get entry order fill details
      ftxccxt.fetchOrders(pair, since = undefined, 1)
        //place stop and target
        .then((res) => {
          stop(res)
          alreadyOrdered = true
        })
        .catch(err => console.log('Eror getting order' + err))
      orderManagement1(gotCandles)
    }
  })

  function stop(res) {
    if (!alreadyOrdered) {
      // //calculate stuff for 1:1 target
      let avgFillPrice = res[0].info.avgFillPrice
      if (avgFillPrice != null) {
        //place stoploss order
        console.log('posting stoploss')
        ftxccxt.createOrder(pair, stopType, stopSide, amount, stopPrice, ccxtstopOverride)
          .then(async (res) => {
            console.log('Stop loss place at price ' + JSON.stringify(res))
          }).catch(err => console.log('Error placing Stop ' + err))
      }
      return
    }
  }
}

async function orderManagement1(candles) {
  // Check variable, if true so function doesn't run after triggered.
  if (om1e) { ftxWs.terminate(), process.exit() }
  if (candles.length > 2) {
    console.log('the candle array length is ' + candles.length)
    //if position is not in profit 3 candles after placing the entry order. cancel all orders and exit
    if (!isShort && candles[2][1] < entryPrice || isShort && candles[2][1] > entryPrice) {
      console.log('position is not in profit after 3 candles, cancelling position and exiting')
      //close position
      // Market orders may not always go through, this needs to be tested. and recoded if needed
      await ftxccxt.createOrder(pair, 'market', stopSide, amount, price = undefined, params = { 'reduceOnly': true })
        .catch(err => console.log('there was an error ' + err))
        .then((res) => {
          console.log(`placed order ` + JSON.stringify(res))
        })
      // Cancel all orders on pair
      await ftxccxt.cancelAllOrders(pair)
        .then(() => {
          console.log('cancelled all orders')
          ftxWs.terminate()
          process.exit()
        })
        .then(() => {
        })
      // Set variable so that this doesnt trigget again 
      om1e = true;
    }
  }
}