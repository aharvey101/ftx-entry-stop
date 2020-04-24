#!usr/bin/env node
const CCXT = require('ccxt');
const FTXWS = require('ftx-api-ws')
require('dotenv').config()

const ftxccxt = new CCXT.ftx({ apiKey: process.env.API_KEY, secret: process.env.API_SECRET })
const ftxWs = new FTXWS({ apiKey: process.env.API_KEY, secret: process.env.API_SECRET })

const { argv } = require("yargs")
  .usage("Usage: binance-oco")
  .example(
    "binance-oco -p BNBBTC -a 1 -b 0.002 -s 0.001 -t 0.003",
    "Place a buy order for 1 BNB @ 0.002 BTC. Once filled, place a stop-limit sell @ 0.001 BTC. If a price of 0.003 BTC is reached, cancel stop-limit order and place a limit sell @ 0.003 BTC."
  )
  // '-p <tradingPair>'
  .demand("pair")
  .alias("p", "pair")
  .describe("p", "Set trading pair eg. BNBBTC")
  // '-a <amount>'
  .demand("amount")
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
  .default("F", false);

const {
  p: pair,
  a: amount,
  e: entryPrice,
  s: stopPrice,
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
  // Short entry Paramaters
  entrySide = "sell";
  entryType = 'limit';
  entryTriggerPrice = (entryPrice + 0.01)
  // ccxt short override
  ccxtOverride = {
    'orderPrice': entryTriggerPrice,
  }
  // Short exit paramaters
  stopSide = 'buy'
  stopType = 'limit'
  cancelPrice = (stopPrice - 0.01)
  ccxtstopOverride = {
    'orderPrice': stopPrice,
    'reduceOnly': true
  }

} else if (!isShort) {
  // Long entry Paramaters
  entrySide = 'buy'
  entryType = 'stop' //stop limit, so use a conditional order with a trigger price
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
}

console.log(isShort)

async function go() {
  await ftxWs.connect()
    .catch(err => console.log(err))
  await ftxccxt.createOrder(pair, entryType, entrySide, amount, entryPrice, ccxtOverride)
    .then((order) => {
      console.log(order)
    })
    .catch(err => console.log('Error posting entry: ' + err))
  await ftxWs.subscribe('ticker', 'BTC-PERP');
  ftxWs.on(`${pair}::ticker`, function (res) {

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
      //get last order and cancel 
      ftxccxt.fetchOpenOrders(pair, since = undefined, 1)
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
    if (ticker.last > 1
      // //if long
      // (entryPrice > stopPrice && ticker.bid <= stopPrice)
      // //if short
      // || (entryPrice < stopPrice && ticker.ask >= stopPrice)
    ) {
      //get entry order fill details
      ftxccxt.fetchOrders(pair, since = undefined, 1)
        //place stop and target
        .then(async (res) => {
          //if the order has a status of closed?
          console.log('placing orders and terminating')
          otherorders(res)
          alreadyOrdered = true

        })
        .catch(err => console.log('Eror getting order' + err))
    }
  })

  const otherorders = (res) => {
    if (alreadyOrdered) {
      console.log('already placed orders, terminating')
      ftxWs.terminate()
      process.exit()
    }
    console.log('order status is: ' + res[0].status)
    let status = res[0].status;
    console.log('got status' + status)
    // //calculate stuff for 1:1 target
    let avgFillPrice = res[0].info.avgFillPrice
    console.log('the avg fill price is: ' + avgFillPrice)
    // let targetPrice = (avgFillPrice + (avgFillPrice - stopPrice))
    // console.log('the target price is ' + targetPrice)
    //if avgFillPrice is there, means order has been filled
    if (avgFillPrice != null) {
      //place stoploss order
      console.log('posting stoploss')
      ftxccxt.createOrder(pair, stopType, stopSide, amount, stopPrice, ccxtstopOverride)
        .then(async (res) => {
          console.log('Stop loss place at price ' + JSON.stringify(res))
          ftxWs.terminate()
        }).catch(err => console.log('Error placing Stop ' + err))

    }
  }
}
go()
