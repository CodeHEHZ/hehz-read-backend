/**
 * @file 用户组 Schema
 *
 * {String} title       用户组名
 * {String} permission  权限
 */

let mongoose = require('../const/db'),
    Schema = mongoose.Schema;

let Group = new Schema({
    title: String,
    permission: [String]
});

module.exports = mongoose.model('Group', Group);