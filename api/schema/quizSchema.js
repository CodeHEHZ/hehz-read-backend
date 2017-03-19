/**
 * @file 测试 Schema
 *
 * {String}     book                所属书的 MongoDB _id
 * {[Object]}   question            问题
 * {String}     question[n].id      问题的 MongoDB _id
 * {String}     question[n].answer  对应问题的答案
 */

let mongoose = require('../const/db'),
    Schema = mongoose.Schema;

let Quiz = new Schema({
    book: String,
    question: [Schema.Types.Mixed]
});

module.exports = mongoose.model('Quiz', Quiz);