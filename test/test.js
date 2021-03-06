var assert = require('assert');
var express = require('express');
var request = require('supertest');
var proxy = require('../');

describe('http-proxy', function() {
  this.timeout(10000);

  var app;
  beforeEach(function() {
    app = express();
    app.use(proxy('httpbin.org'));
  });
  
  describe('test https', function() {
    it('https', function(done) {
      var https = express();
      https.use(proxy('https://httpbin.org'));
      request(https)
        .get('/user-agent')
        .end(function(err, res) {
          if (err) return done(err);
          assert(res.body);
          done();
        });
    });
  });

  describe('test intercept & decorateRequest', function() {
    it('decorateRequest', function(done) {
      var app = express();
      app.use(proxy('httpbin.org', {
        decorateRequest: function(req) {
          req.path = '/ip';
          req.bodyContent = 'data';
        }
      }));

      request(app)
        .get('/user-agent')
        .end(function(err, res) {
          if (err) return done(err);
          assert(res.body.origin);
          done();
        });
    });


    it('intercept', function(done) {
      var app = express();
      app.use(proxy('httpbin.org', {
        intercept: function(data, req, res, cb) {
          data = JSON.parse(data.toString('utf8'));
          data.intercepted = true;
          cb(null, JSON.stringify(data));
        }
      }));

      request(app)
        .get('/ip')
        .end(function(err, res) {
          if (err) return done(err);
          assert(res.body.intercepted);
          done();
        });
    });

    it('test intercept on html response',function(done) {
      var app = express();
      app.use(proxy('httpbin.org', {
        intercept: function(data, req, res, cb) {
          data = data.toString().replace('Oh','<strong>Hey</strong>');
          assert(data !== "");
          cb(null, data);
        }
      }));
      
      request(app)
        .get('/html')
        .end(function(err, res) {
          if (err) return done(err);
          assert(res.text.indexOf('<strong>Hey</strong>') > -1);
          done();
        });
    });

    it('test github api', function(done) {
      var app = express();
      app.use(proxy('https://api.github.com',  {
        intercept: function(data, req, res, cb) {
          var Iconv = require('iconv').Iconv;
          var iconv = new Iconv('UTF-8', 'utf8');
          cb(null, data);
        }
      }));

      request(app)
        .get('/')
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });

    });
  });


  describe('test proxy cookie', function() {
    it('set cookie', function(done) {
      request(app)
        .get('/cookies/set?mycookie=value')
        .end(function(err, res) {
          assert(res.headers['set-cookie']);
          done(err);
        });
    });
  });

  describe('test proxy status', function() {
    [304, 404, 200, 401, 500].forEach(function(status) {
      it(status, function(done) {
        request(app)
          .get('/status/' + status)
          .expect(status, done);
      });
    });
  });

  it('test proxy get', function(done) {
    request(app)
      .get('/get')
      .end(function(err, res) {
        if (err) return done(err);
        assert(/node-superagent/.test(res.body.headers['User-Agent']));
        assert.equal(res.body.url, 'http://httpbin.org/get');
        done(err);
      });
  });

  it('test proxy post', function(done) {
    request(app)
      .post('/post')
      .send({
        mypost: 'hello'
      })
      .end(function(err, res) {
        assert.equal(res.body.data, '{"mypost":"hello"}');
        done(err);
      });
  });



  it('test proxy put', function(done) {
    request(app)
      .put('/put')
      .send({
        mypost: 'hello'
      })
      .end(function(err, res) {
        assert.equal(res.body.data, '{"mypost":"hello"}');
        done(err);
      });

  });


  it('test proxy patch', function(done) {
    request(app)
      .patch('/patch')
      .send({
        mypost: 'hello'
      })
      .end(function(err, res) {
        assert.equal(res.body.data, '{"mypost":"hello"}');
        done(err);
      });

  });

  it('test proxy delete', function(done) {
    request(app)
      .del('/delete')
      .send({
        mypost: 'hello'
      })
      .end(function(err, res) {
        assert.equal(res.body.data, '{"mypost":"hello"}');
        done(err);
      });

  });

});
