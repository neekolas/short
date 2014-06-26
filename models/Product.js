
/**
 * @model Product
 */

var options
  , ProductSchema
  , mongoose = require('../node_modules/mongoose')
  , wrapper = require('./prototype.js')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

options = { 
  versionKey : false
};

ProductSchema = new Schema({
  id         : { type : ObjectId },
  short_key  : { type : String, unique: true, required: true, index: true },
  info       : { type : Schema.Types.Mixed },
  shorturls  : { type : Schema.Types.Mixed }, 
  created_at : { type : Date, default: Date.now },
  updated_at : { type : Date }
}, options);

exports.Product = new wrapper.Model(mongoose.model('Product', ProductSchema));
