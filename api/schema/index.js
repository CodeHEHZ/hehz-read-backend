/**
 * @file 输出 Schema
 *
 * 调用 Schema 时只需 require() 此目录，
 * 如 let schemas = require('../schema')，
 * 然后引用某个 Schema 即可，如 schemas.Account。
 */

let Account = require('./accountSchema'),
    Group = require('./groupSchema');

module.exports = {
    Account,
    Group
};