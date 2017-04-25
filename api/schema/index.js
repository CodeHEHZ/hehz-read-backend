/**
 * @file 输出 Schema
 *
 * 调用 Schema 时只需 require() 此目录，
 * 如 let schemas = require('../schema')，
 * 然后引用某个 Schema 即可，如 schemas.Account、schemas.Book 等。
 */

let User = require('./userSchema'),
    UserTag = require('./userTagSchema'),
    Group = require('./groupSchema'),
    Book = require('./bookSchema'),
    Question = require('./questionSchema'),
    Quiz = require('./quizSchema'),
    File = require('./fileSchema');

// 请熟悉 JavaScript ES6 规范
module.exports = {
    User,
    UserTag,
    Group,
    Book,
    Question,
    Quiz,
    File
};