'use strict';

let mongodb = require('mongodb');
let mongoose = require('mongoose');
const { response } = require('../server');
let XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest
const saltRounds = 8;
const bcrypt = require('bcrypt')

module.exports = function (app) {

  //mongoose setup
  mongoose.connect(process.env.MONGO_URI, { useNewUrlparser: true, useUnifiedTopology: true });
  //schema for the stock likes saver
  let stockSchema = new mongoose.Schema({
    name: {type: String, required: true},
    likes: {type: Number, default: 0}, //note how we can set a default here
    ips: [String]
  })
  //create the model
  let Stock = mongoose.model('Stock', stockSchema)


  app.route('/api/stock-prices')
    .get(function (req, res){
      console.log(req.query)
      let resultObj = {}
      resultObj.stockData = {}

      //number of stocks selected//
      let twoStocks = false

      //response output//
      const outputResponse = () => {
        return res.json(resultObj)
      }

      //find/update Stock document//
      const findOrUpdateStock = (stockName, documentUpdate, nextStep) => {
        Stock.findOneAndUpdate(
          {name: stockName}, //this is what we're looking for in the db
          documentUpdate, //passing in our update params
          {new: true, upsert: true}, //we want the new doc returned, and update/or/insert true
          (error, stockDocument) => {
            if(error){
              console.log(error)
            }else if(!error && stockDocument){
              if(twoStocks === false){
                return nextStep(stockDocument, processOneStock)
              }else{
                return nextStep(stockDocument, processTwoStocks)
              }
            }
          }
        )
      }

      //Like stock//
      const likeStock = (stockName, nextStep) => {
        Stock.findOne({name: stockName}, (error, stockDocument) => {
          if(!error && stockDocument && stockDocument.ips.length > 0){
            //for each ip in the database stock document
            stockDocument.ips.forEach(IPhash => {
              console.log(IPhash)
              //check current request ip against hash in the db
              bcrypt.compare(req.ip, IPhash, (err, res) => {
                //if it's a match
                if(res === true) {
                  //do not increase likes nor add new ip hashes to db
                  let documentUpdate = {}
                  nextStep(stockName, documentUpdate, getPrice)
                }
              })
            })
          }else{
            //bit silly but good practice for bcrypt anyway
            bcrypt.hash(req.ip, saltRounds, (error, IPhash) => {
              let documentUpdate = {$inc: {likes: 1}, $push: {ips: IPhash}}
              nextStep(stockName, documentUpdate, getPrice);
            })
          }
        })
      }

      //get price//
      const getPrice = (stockDocument, nextStep) => {
        let xhr = new XMLHttpRequest();
        let requestUrl = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stockDocument.name}/quote`
        xhr.open('GET', requestUrl, true) //the true stands for async = true
        xhr.onload = () => {
          let apiResponse = JSON.parse(xhr.responseText) //parse the response
          if(apiResponse && apiResponse === 'Unknown symbol') {
            return res.json({error: 'Symbol not found'});
          }
          stockDocument.price = apiResponse.latestPrice.toFixed(2) //round to 2 decimal points
          nextStep(stockDocument, outputResponse)
        }
        xhr.send()
      }

      //response for single stock//
      const processOneStock = (stockDocument, nextStep) => {
        resultObj.stockData.stock = stockDocument.name
        resultObj.stockData.price = parseFloat(stockDocument.price)
        resultObj.stockData.likes = stockDocument.likes
        nextStep()
      }

      let stocks = []
      //response for dual stocks//
      const processTwoStocks = (stockDocument, nextStep) => {
        let newStock = {}
        newStock.name = stockDocument.name
        newStock.price = parseFloat(stockDocument.price)
        newStock.likes = stockDocument.likes
        stocks.push(newStock)
        if(stocks.length === 2){
          stocks[0].rel_likes = stocks[0].likes - stocks[1].likes
          stocks[1].rel_likes = stocks[1].likes - stocks[0].likes
          resultObj.stockData = stocks
          nextStep()
        }else{
          return
        }
      }

      //input processor//
      if(typeof (req.query.stock) === 'string') {
        //one stock//
        let stockName = req.query.stock
        let documentUpdate = {}
        if(req.query.like && req.query.like === 'true') {
          likeStock(stockName, findOrUpdateStock)
        }else{
          let documentUpdate = {}
          findOrUpdateStock(stockName, documentUpdate, getPrice)
        }

      } else if (Array.isArray(req.query.stock)) {
        twoStocks = true
        //stock 1//
        let stockName = req.query.stock[0]
        if(req.query.like && req.query.like === 'true') {
          likeStock(stockName, findOrUpdateStock)
        }else{
          let documentUpdate = {}
          findOrUpdateStock(stockName, documentUpdate, getPrice)
        }

        //stock 2//
        stockName = req.query.stock[1]
        if(req.query.like && req.query.like === 'true') {
          likeStock(stockName, findOrUpdateStock)
        }else{
          let documentUpdate = {}
          findOrUpdateStock(stockName, documentUpdate, getPrice)
        }

      }
    });  
};
