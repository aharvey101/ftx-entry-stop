const CCXT = require('ccxt');
const FTXWS = require('ftx-api-ws')
require('dotenv').config()

const ftxccxt = new CCXT.ftx({
  apiKey: process.env.API_KEY,
  secret: process.env.API_SECRET,

})

const ftxWs = new FTXWS({
  apiKey: process.env.API_KEY,
  secret: process.env.API_SECRET,
})

const pair = 'BTC-PERP'
const timeframe = '1m'
const entryPrice = 10000;
const orderParams = {
  'reduceOnly': true
}
const stopSide = 'sell'
const amount = 0.2
let isShort = false;

go()

let oop = false
let om1e = false
const since = Date.now() - 179000
async function go() {
  let gotCandles = []
  await ftxWs.connect()
    .catch(err => console.log(err));
  await ftxWs.subscribe('ticker', pair);
  ftxWs.on(`${pair}::ticker`, async function (res) {
    ftxccxt.fetchOHLCV('BTC-PERP', timeframe, since, limit = undefined, params = {})
      .then(candles => {
        gotCandles = candles
      })
    console.log(om1e)
    orderManagement1(gotCandles)
    //console.log(res.last)
    placeOtherOrders(res)
    oop = true;
  })
}

function placeOtherOrders(res) {
  if (oop) {
    return;
  } else {
    console.log('placing the other orders')
  }
}


async function orderManagement1(candles) {
  // statement so function doesn't run after triggered.
  if (om1e) { ftxWs.terminate(), process.exit() }
  if (candles.length > 2) {
    console.log(candles.length)
    // Set variable so that this doesnt trigget again 
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
      om1e = true;
    }

  }
}