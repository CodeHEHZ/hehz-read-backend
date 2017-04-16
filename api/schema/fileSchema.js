let mongoose = require('../const/db'),
    Schema = mongoose.Schema;

let fileSchema = new Schema({
    'originalFilenameName': String,
    'uploadTime': { type: Date, default: new Date() },
    'key': String,
    'hash': String
});

module.exports = mongoose.model('File', fileSchema);