const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

    test('Viewing one stock: GET request to /api/stock-prices/', function(done) {
        chai.request(server)
            .get('/api/stock-prices')
            .query({stock: 'goog'})
            .end(function(err, res) {
                assert.equal(res.body.stockData.stock, 'goog');
                assert.isNotNull(res.body.stockData.price);
                assert.isNotNull(res.body.stockData.likes);
                done();
            })
    })

    test('Viewing one stock and liking it: GET request to /api/stock-prices/', function(done) {
        chai.request(server)
            .get('/api/stock-prices')
            .query({stock: 'aapl', like: true})
            .end(function(err, res) {
                assert.equal(res.body.stockData.stock, 'aapl');
                assert.equal(res.body.stockData.likes, 1)
                done();
            })
    })

    test('Viewing the same stock and liking it again: GET request to /api/stock-prices/', function(done) {
        chai.request(server)
            .get('/api/stock-prices')
            .query({stock: 'aapl', like: true})
            .end(function(err, res) {
                assert.equal(res.body.stockData.stock, 'aapl');
                assert.equal(res.body.stockData.likes, 1)
                done();
            })
    })

    test('Viewing two stocks: GET request to /api/stock-prices/', function(done) {
        chai.request(server)
            .get('/api/stock-prices?stock=GOOG&stock=MSFT&like=false')
            .end(function(err, res) {
                assert.isArray(res.body.stockData)
                assert.isString(res.body.stockData[0].name)
                assert.isString(res.body.stockData[0].name)
                done();
            })
    })

    test('Viewing two stocks: GET request to /api/stock-prices/', function(done) {
        chai.request(server)
            .get('/api/stock-prices?stock=GOOG&stock=MSFT&like=true')
            .end(function(err, res) {
                assert.isArray(res.body.stockData)
                assert.isString(res.body.stockData[0].name)
                assert.equal(res.body.stockData[0].rel_likes, 0)
                assert.isString(res.body.stockData[1].name)
                assert.equal(res.body.stockData[1].rel_likes, 0)
                done();
            })
    })


});
