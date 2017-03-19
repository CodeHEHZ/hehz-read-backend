/**
 * @file 题目 Schema
 *
 * {String}     question            题目
 * {String}     book                所属书的 MongoDB _id
 * {[Object]}   option              选项
 * {String}     option[n].label     选项标签，如 "A"、"B"、"C"、"D"
 * {String}     option[n].text      选项内容，如 "生动形象地描述了雷叔丰富多彩的老年生活"
 * {String}     answer              正确答案，如 "A"
 * {Number}     difficulty          难度，1 ~ 正无穷，1 最简单
 */

let mongoose = require('../const/db'),
    Schema = mongoose.Schema;

let Question = new Schema({
    question: String,
    option: Schema.Types.Mixed,
    answer: String,
    book: String,
    difficulty: { type: Number, default: 1 }
});

module.exports = mongoose.model('Question', Question);