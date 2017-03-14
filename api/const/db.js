/**
 * @file 输出 mongoose
 *
 * 这里将 mongoose 的 Promise 设为原生 Promise，
 * 并将其连接至本地的 hehz-read 收集。
 */

let mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/hehz-read');

module.exports = mongoose;