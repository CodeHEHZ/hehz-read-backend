let mongoose = require('../const/db'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose');

let Account = new Schema({
    username: String,
    password: String,
    createdTime: { type: Date, default: new Date() },
    schoolId: String
});

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);