/**
 * @file 账户 Schema
 *
 * {String} username    用户名
 * {String} password    密码
 * {Date}   createdTime 创建时间
 * {String} schoolId    学号
 * {String} group       用户组，默认为 student
 */

let mongoose = require('../const/db'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose');

let Account = new Schema({
    username: String,
    password: String,
    createdTime: { type: Date, default: new Date() },
    schoolId: String,
    group: { type: String, default: 'student' }
});

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);