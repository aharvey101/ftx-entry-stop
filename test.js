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

let isShort = true;

go()

let oop = false
let om1 = false
const since = Date.now() - 120000
async function go() {
  let gotCandles
  await ftxWs.connect()
    .catch(err => console.log(err));
  await ftxWs.subscribe('ticker', pair);
  ftxWs.on(`${pair}::ticker`, async function (res) {
    ftxccxt.fetchOHLCV('BTC-PERP', timeframe, since, limit = undefined, params = {})
      .then(candles => {
        gotCandles = candles
      })

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


function orderManagement1(candles) {
  // statement so function doesn't run after triggered.
  if (om1) {
    return;
    //if there are three items in the array then
  } else if (candles.length = 2) {
    // Set variable so that this doesnt trigget again 
    om1 = true;
    //if position is not in profit 3 candles after placing the entry order. cancel all orders and exit
    if (!isShort && res[2][1] < entryPrice || isShort && res[2][1] > entryPrice) {
      console.log('position is not in profit after 3 candles, cancelling position and exiting')
      //close position
      // Market orders may not always go through, this needs to be tested. and recoded if needed
      ftxccxt.createOrder(pair, 'market', stopSide, amount, price = undefined, orderParams)
        .catch(err => console.log('there was an error ' + err))
      // Cancel all orders on pair
      ftxccxt.cancelAllOrders(pair)
        .then(() => {
          ftxWs.terminate()
          process.exit()
        })
    }
  } else {
  }
}