/**
 * @file 题目 Schema
 *
 * {String}     question            题目
 * {String}     book                所属书的 MongoDB _id
 * {[Object]}   option              选项
 * {String}     option[label].text  选项内容，如 "生动形象地描述了雷叔丰富多彩的老年生活"
 * {String}     answer              正确答案，如 "A"
 * {Number}     difficulty          难度，1 ~ 正无穷，1 最简单
 * {Boolean}    open                是否开放供测试
 */

let mongoose = require('../const/db'),
    Schema = mongoose.Schema;

let Question = new Schema({
    question: String,
    option: Schema.Types.Mixed,
    answer: String,
    book: String,
    difficulty: { type: Number, default: 1 },
    open: { type: Boolean, default: true }
});

module.exports = mongoose.model('Question', Question);