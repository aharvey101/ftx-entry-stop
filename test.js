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


go()

const since = Date.now()
async function go() {
  await ftxWs.connect()
    .catch(err => console.log(err));
  await ftxWs.subscribe('ticker', pair);
  ftxWs.on(`${pair}::ticker`, async function (res) {
    //console.log(res.last)
    ftxccxt.fetchOHLCV('BTC-PERP', timeframe, since, limit = undefined, params = {})
      .then(async res => {
        //if position is not in profit after 3 candles of placing the entry order. cancel all orders and exit
        if (res[2][1] < entryPrice) {
          console.log('position is not in profit after 3 candles, cancelling position and exiting')
          //close position
          ftxccxt.createOrder(pair, 'market', 'sell', '0.1', price = undefined, orderParams)
            .catch(err => console.log(err))
          // Cancel all orders on pair
          ftxccxt.cancelAllOrders(pair)
            .then(() => {
              ftxWs.terminate()
              process.exit()
            })
        }
      })
      .catch(err => {
        console.log(err)
      })
  })
}



