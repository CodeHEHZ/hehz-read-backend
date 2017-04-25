/**
 * @file 账户标签 Schema
 *
 * {[String]}   tags    标签
 */

let mongoose = require('../const/db'),
  Schema = mongoose.Schema;

let UserTag = new Schema({
    tag: { type: [String], default: [] }
});

module.exports = mongoose.model('UserTag', UserTag);