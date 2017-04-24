/**
 * @file 账户 Schema
 *
 * {String}     username    用户名
 * {String}     password    密码
 * {Date}       createdTime 创建时间
 * {String}     uid         学号
 * {String}     group       用户组，默认为 student
 * {[Mixed]}   book    通过测试的书
 */

let mongoose = require('../const/db'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose');

let User = new Schema({
    username: String,
    password: String,
    createdTime: { type: Date, default: new Date() },
    uid: String,
    group: { type: String, default: 'student' },
    book: { type: [Schema.Types.Mixed], default: [] }
});

User.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', User);