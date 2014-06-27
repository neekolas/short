/**
 * @list dependencies
 */

var ID = require('short-id')
  , mongoose = require('mongoose')
  , Promise = require('node-promise').Promise
  , ShortURL = require('../models/ShortURL').ShortURL
  , request = require('request')
  , url = require('url')
  , Product = require('../models/Product').Product
  , shorten = {}
  , geoip = require('geoip-lite');


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

shorten.connect = function(mongodb) {
  mongoose.connect(mongodb);
  shorten.connection = mongoose.connection;
};

/**
 * @method generate
 * @param {Object} options Must at least include a `URL` attribute
 */

shorten.generate = function(document, forcehash) {
  var generatePromise
    , promise = new Promise()
    , generatedHash = ID.store(document.URL+document.pubID)
    , query = { URL: document.URL, pubID: document.pubID };
  document['URL'] = document.URL;
  document['pubID'] = document.pubID;
  document['hash'] = generatedHash;
  if (forcehash) {
    document['hash'] = forcehash;
  }
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

shorten.retrieve = function(hash) {
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

shorten.hits = function(hash) {
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

shorten.list = function() {
  var promise = new Promise();
  var listPromise = ShortURL.find({});
  listPromise.then(function(ShortenedURLObjects) {
    promise.resolve(ShortenedURLObjects);
  }, function(error) {
    promise.reject(error, true);
  });
  return promise;
};

shorten.updateMe = function(hash, key, data) {
  var promise = new Promise();
  var blankKey = {}
  blankKey[key] = data
  var query = { hash : hash }
	  	, update = { $set: blankKey }
	    , options = {};
  console.log(update)
  var retrievePromise = ShortURL.findOne(query);
  ShortURL.update(query, update, options, function(){ });
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
 * Add a product to the db
 * @Must include a product object
 */
shorten.addProduct = function(result) {
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

shorten.linkProduct = function(product, hash) {
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

shorten.chooseDestination = function(shortObj, req) {
    var originalURL = shortObj.URL;
    if (shortObj.bizrate) {
        var geo = geoip.lookup(req.ip)
        if (geo) {
            var country = geo.country;
            console.log(country);
        }
        if (!shortObj.bizrateBid || country !== 'US') {
            var originalURL = shortObj.bizrateURL
        } else {
            return originalURL 
        }
    }
    if (shortObj.skimlink) {
        var destinationURL = 'http://buy.wantering.com/?id=' + shortObj.pubID + '&xs=1&url='+encodeURIComponent(originalURL)
    } else {
        destinationURL = originalURL;
    } 
    return destinationURL
}

shorten.generateRoute = function(req, res, skimlink, addWantProduct, log) {
  var routePromise = new Promise();
  var requestURL = req.query.url;
  var parsedURL = url.parse(requestURL);
  if (req.query.bizrate) {
      var bizrateData = decodeURIComponent(req.query.bizrate);
      var bizrate = JSON.parse(bizrateData);
      skimlink = true;
  } else {
      var bizrate = null;
  }
  if (req.query.forcehash) {
    forcehash = req.query.forcehash;
  } else {
    forcehash = false;
  }
  var publisher = req.query.pub;
  var shortURLPromise = shorten.generate({
      URL : requestURL,
      pubID : publisher,
      skimlink : skimlink,
      bizrate : bizrate
  }, forcehash);
  // Retrieves the Short URL document it just created
  shortURLPromise.then(function(mongodbDoc) {
    console.log('>> created short URL: %s', mongodbDoc.hash);
    //Check Wantering and see if there is a product match
    var addProductPromise = addWantProduct.add(parsedURL.hostname, requestURL, mongodbDoc.hash)
    addProductPromise.then(function(result) {
      console.log('About to return');
      routePromise.resolve(result)
      if (result.bizrate) {
        console.log('Bizrate match found');
        addWantProduct.besoLookup(result.bizrate.offerID, result.hash);
      }
    }, function(error) {
      if (error) {
        log.log({event: 'Shorterror', text: 'Retrieval problem' + error});
        routePromise.reject(new Error('Retrieval problem'), true);
      }
    });
  }, function(error) {
    if (error) {
      log.log({event: 'Shorterror', text: 'Creation problem' + error});
      routePromise.reject(new Error('Creation problem'), true);
    }
  });
  return routePromise
}

module.exports = shorten;

