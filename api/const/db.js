/**
 * @file 输出 mongoose
 *
 * 这里将 mongoose 的 Promise 设为原生 Promise，
 * 并将其连接至本地的 hehz-read 收集。
 */

let mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let username = process.env.MONGO_USERNAME || 'readAdmin',
    password = process.env.MONGO_PWD,
    port = process.env.MONGO_PORT || 27017,
    host = process.env.MONGO_HOST || '127.0.0.1',
    database = process.env.MONGO_DATABASE || 'hehz-read',
    auth = process.env.MONGO_AUTH || false;

if (auth) {
    mongoose.connect('mongodb://' + username + ':' + password + '@' + host + ':' + port + '/' + database)
} else {
    mongoose.connect('mongodb://' + host + ':' + port + '/' + database);
}

module.exports = mongoose;