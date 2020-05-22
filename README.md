# FTX-Entry-Stop

This is a script for managing the entrance of a trade on the FTX exchange built using ccxt and ftx-api-ws packages

## Installation

Clone into repo and install packages


## Usage

Currently the only way to use this is to run use node to run the script with arguments for example:

node index.js -p ETH-PERP -a 1 -e 150 -s 125

## Roadmap

There are several features that I want to add to this:

  - Make this an npm package so that it can be run system wide
  - Add post entry order management:
    - The three different order management strategies
      -If after 3 post entry candles, position is not in profit, cancel position
      -If price moves more than 15% in favour of position within the first 3 candles,
        move stop to higher low (long) / lower high (short) on 1 timeframe lower than entry timeframe
      -If trade has moved up but not more than 15% as to trigger order management function 2, move the stop to the '61.8% fib level'

## License
[ISC](https://en.wikipedia.org/wiki/ISC_license)
