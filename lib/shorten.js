/**
 * @list dependencies
 */

var ID = require('short-id')
  , mongoose = require('mongoose')
  , Promise = require('node-promise').Promise
  , ShortURL = require('../models/ShortURL').ShortURL
  , request = require('request')
  , Product = require('../models/Product').Product;

/**
 * @configure short-id
 */

ID.configure({
  length: 5,
  algorithm: 'sha1',
  salt: Math.random()
});

/**
 * @method connect
 * @param {String} mongdb Mongo DB String to connect to
 */

exports.connect = function(mongodb) {
  mongoose.connect(mongodb);
  exports.connection = mongoose.connection;
};

/**
 * @method generate
 * @param {Object} options Must at least include a `URL` attribute
 */

exports.generate = function(document) {
  var generatePromise
    , promise = new Promise()
    , generatedHash = ID.store(document.URL+document.pubID)
    , query = { URL: document.URL, pubID: document.pubID };
  document['URL'] = document.URL;
  document['pubID'] = document.pubID;
  document['hash'] = generatedHash;
  document['data'] = (document.data) ? document.data : null;
  generatePromise = ShortURL.findOrCreate(query, document, {});
  generatePromise.then(function(ShortURLObject) {
    promise.resolve(ShortURLObject);
  }, function(error) {
    promise.reject(error, true);
  });
  return promise;
};

/**
 * @method retrieve
 * @param {Object} options Must at least include a `hash` attribute
 */

exports.retrieve = function(hash) {
  var promise = new Promise();
  var query = { hash : hash } 
    , update = { $inc: { hits: 1 } }
    , options = { multi: true };
  var retrievePromise = ShortURL.findOne(query);
  ShortURL.update( query, update , options , function (){ } );
  retrievePromise.then(function(ShortURLObject) {
    if (ShortURLObject && ShortURLObject !== null) {
      promise.resolve(ShortURLObject);
    } else {
      promise.reject(new Error('MongoDB - Cannot find Document'), true);
    };
  }, function(error) {
    promise.reject(error, true);
  });
  return promise;
};

/**
 * @method hits
 * @param {Object} options Must at least include a `hash` attribute
 */

exports.hits = function(hash) {
  var promise = new Promise();
  var query = { hash : hash } 
    , options = { multi: true };
  var retrievePromise = ShortURL.findOne(query);
  ShortURL.update(query, update, options, function(){ });
  retrievePromise.then(function(ShortURLObject) {
    if (ShortURLObject && ShortURLObject !== null) {
      promise.resolve(ShortURLObject.hits);
    } else {
      promise.reject(new Error('MongoDB - Cannot find Document'), true);
    };
  }, function(error) {
    promise.reject(error, true);
  });
  return promise;
};

/**
 * @method list
 * @description List all Shortened URLs
 */

exports.list = function() {
  var promise = new Promise();
  var listPromise = ShortURL.find({});
  listPromise.then(function(ShortenedURLObjects) {
    promise.resolve(ShortenedURLObjects);
  }, function(error) {
    promise.reject(error, true);
  });
  return promise;
};

exports.updateMe = function(hash, key, data) {
  console.log(ShortURL.baseModel)
  var promise = new Promise();
  var query = { hash : hash }
	  	, update = { $set: { 'data' : data } }
	    , options = {'multi': true };
  var retrievePromise = ShortURL.findOne(query);
  ShortURL.update(query, update, options, function(){ });
  retrievePromise.then(function(ShortURLObject) {
  	console.log(shortURLObject);
    if (ShortURLObject && ShortURLObject !== null) {
      promise.resolve(ShortURLObject.data);
    } else {
      promise.reject(new Error('MongoDB - Cannot find Document'), true);
    };
  }, function(error) {
    promise.reject(error, true);
  });
  return promise;
};

exports.findProduct = function(shortkey) {
	console.log('Finding '+shortkey);
	var promise = new Promise();
	request('http://www.wantering.com/api/product/'+ shortkey +'/', function(error, response, body) {
	  if (!error && response.statusCode == 200) {
	    var productInfo = JSON.parse(body);
	    //console.log(productInfo)
	    promise.resolve(productInfo.docs[0])
	  }
	  else {
	  	promise.reject(new Error('Couldn\'t get the product info'), true);
	  }
	});
	return promise
}

/**
 * Add a product to the db
 * @Must include a product object
 */
exports.addProduct = function(result) {
      console.log(result);
	  var generatePromise
	    , promise = new Promise()
	    , shortkey = result.short_key
	    , document = {}
	    , query = { short_key : shortkey };

	  document['short_key'] = shortkey;
	  document['info'] = result;
	  var generatePromise = Product.findOrCreate(query, document, {});
	  generatePromise.then(function(result) {
	    promise.resolve(result);
	    console.log(result);
	  }, function(error) {
	    promise.reject(error, true);
	  });
	  return promise;
}
exports.linkProduct = function(product, hash) {
  console.log('About to link up to '+product.short_key);
  var promise = new Promise();
  var query = { hash : hash } 
  var retrievePromise = ShortURL.findOne(query);
  retrievePromise.then(function(ShortURLObject) {
    if (ShortURLObject && ShortURLObject !== null) {
        ShortURLObject.shortkey = product.short_key;
        ShortURLObject.product = product.info;
        console.log(ShortURLObject.product);
        ShortURLObject.save(function (err) {
            if (err) {
                promise.reject(new Error('Couldn\'t save ShortURLObject'), true);
            }  
        });
        promise.resolve(ShortURLObject);
    } else {
        promise.reject(new Error('MongoDB - Cannot find Document'), true);
    }
  }, function(error) {
    promise.reject(error, true);
  });
  return promise;
}

exports.chooseDestination = function(shortObj) {
    var originalURL = shortObj.URL;
    if (shortObj.skimlink) {
        var destinationURL = 'http://buy.wantering.com/?id=' + shortObj.pubID + '&xs=1&url='+encodeURIComponent(originalURL)
    } else {
        destinationURL = originalURL;
    } 
    return destinationURL
}
