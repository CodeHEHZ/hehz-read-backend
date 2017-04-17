/**
 * @file 书本 Schema
 *
 * {String}     name        书名
 * {String}     author      作者
 * {Boolean}    open        是否开放
 * {[String]}   category    种类
 * {[Mixed]}    quiz        测试的 MongoDB _id
 * {String}     cover       书的封面图片链接
 * {String}     creator     创建人
 */

let mongoose = require('../const/db'),
    Schema = mongoose.Schema;

let Book = new Schema({
    name: String,
    author: String,
    open: { type: Boolean, default: false },
    category: { type: [String], default: ['长篇小说'] },
    quiz: { type: [Schema.Types.Mixed], default: [] },
    description: String,
    cover: String,
    creator: String
});

module.exports = mongoose.model('Book', Book);