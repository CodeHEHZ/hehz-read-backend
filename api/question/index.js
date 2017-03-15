/**
 * @file 题目接口
 * @author IncredibLink(incrediblelink@gmail.com)
 *
 * 获取单个题目的信息：GET /question/:id
 * 创建新的题目：POST /question/new
 */

let express = require('express'),
    router = new express.Router(),
    Step = require('step'),
    CheckError = require('../util/checkError'),
    ensureLoggedIn = require('../util/ensureLoggedIn.middleware'),
    permittedTo = require('../util/permittedTo.middleware'),
    paramValidator = require('../util/paramValidator.middleware'),
    cache = require('../util/cacheSystem'),
    QuestionService = require('./question.service'),
    BookService = require('../book/book.service'),
    Question = require('../schema').Question,
    Book = require('../schema').Book;


/**
 * 获取单个题目的信息
 * GET /question/:id
 * 
 * @param {String}  id  题目的 MongoDB _id
 *
 * @response 200 获取成功
 * {Object} question    题目信息
 */

router.get('/:id', ensureLoggedIn, function(req, res) {
    let no = new CheckError(res).check;

    Step(
        function() {
            QuestionService.getSingleQuestion(req.params.id, this);
        },
        function(err, question) {
            if (no(err)) {
                res.status(200).json(question);
            }
        }
    );
});


/**
 * 创建新的题目
 * POST /question/new
 *
 * @param {String}      author          要加题目的书的作者
 * @param {String}      name            要加题目的书的书名
 * @param {String}      bookId          要加题目的书的 MongoDB _id（以上三者中，只要有前两者或只有第三者即可）
 * @param {String}      question        问题
 * @param {[Object]}    option          选项
 * @param {String}      option[n].A     选项内容
 * @param {String}      answer          答案（标签如 'A'、'B'
 *
 * @response 201 创建成功
 * {String} message 消息提示
 *
 * @response 400/404 创建失败
 * {String} error   错误名
 * {String} message 错误信息
 */

router.post('/new', ensureLoggedIn, permittedTo('CreateQuestion'),
    paramValidator('question', 'option', 'answer'), function(req, res) {
    let no = new CheckError(res).check,
        _book,
        _question;

    if (!req.body.option[req.body.answer]) {
        return res.status(400).json({
            error: 'NoAnswer',
            message: '好像答案不在选项中？'
        });
    }

    Step(
        // 先根据所给条件找书
        function() {
            if (req.body.author && req.body.name) {
                BookService.getSingleBook(req.body.author, req.body.name, 'original', this);
            } else if (req.body.bookId) {
                Book.findById(req.body.bookId, this);
            } else {
                res.status(400).json({
                    error: 'MissingParam(s)',
                    message: '请求缺少某个/某些参数'
                });
            }
        },
        // 找到书了就建题
        function(err, book) {
            if (no(err)) {
                if (book) {
                    _book = book;
                    Question.find({
                        question: req.body.question,
                        book: _book._id
                    }, this);
                } else {
                    res.status(404).json({
                        error: 'BookNotFound',
                        message: 'The book you look for doesn\'t exist.'
                    });
                }
            }
        },
        function(err, results) {
            if (no(err)) {
                if (!results) {
                    _question = new Question({
                        question: req.body.question,
                        book: _book._id,
                        option: req.body.option,
                        answer: req.body.answer
                    });
                    _question.save(this);
                } else {
                    res.status(400).json({
                        error: 'DuplicatedQuestion',
                        message: '题库中已有题面相同的题目'
                    });
                }
            }
        },
        // 然后把书的相关缓存先删了
        function(err) {
            if (no(err)) {
                cache.update(_book._id, this);
            }
        },
        // 再把题目加进书的题库中
        function(err) {
            if (no(err)) {
                Book.update({ _id: _book._id }, {
                    $addToSet: {
                        question: _question._id
                    }
                }, this);
            }
        },
        function(err) {
            if (no(err)) {
                res.status(201).json({
                    message: 'Created.'
                });
            }
        }
    );
});

module.exports = router;