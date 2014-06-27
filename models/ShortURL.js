
/**
 * @model ShortURL
 */

var options
  , ShortURLSchema
  , mongoose = require('mongoose')
  , wrapper = require('./prototype.js')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

options = { 
  versionKey : false
};

ShortURLSchema = new Schema({
  id         : { type : ObjectId },
  URL        : { type : String },
  pubID      : { type : String, default: '20569X892016', index: true },
  pubName    : { type : String },
  hash       : { type : String, index: true },
  hits       : { type : Number, default: 0 },
  data       : { type : Schema.Types.Mixed },
  product    : { type : Schema.Types.Mixed },
  shortkey   : { type : String },
  skimlink   : { type : Boolean },
  skimURL    : { type : String },
  bizrate    : { type : Schema.Types.Mixed },
  bizrateBid : { type : Boolean },
  bizrateURL : { type : String },
  created_at : { type : Date, default: Date.now },
}, options);

exports.ShortURL = new wrapper.Model(mongoose.model('ShortURL', ShortURLSchema));
