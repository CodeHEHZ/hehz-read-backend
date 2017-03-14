/**
 * @file 图书接口
 * @author IncredibLink(incrediblelink@gmail.com)
 *
 * 获取单个书本的信息：GET  /book/:author/:name
 * 批量获取书本的信息：POST /book
 */

let express = require('express'),
    router = express.Router(),
    Step = require('step'),
    CheckError = require('../util/checkError'),
    ensureLoggedIn = require('../util/ensureLoggedIn.middleware'),
    permittedTo = require('../util/permittedTo.middleware'),
    paramValidator = require('../util/paramValidator'),
    Book = require('../schema').Book;


/**
 * 获取单个书本的信息
 * GET /book/:author/:name
 *
 * @param {String}  name    书名
 * @param {String}  author  作者
 *
 * @response 200 查得书本
 * {String}     name        书名
 * {String}     author      作者
 * {Boolean}    open        是否开放
 * {[String]}   category    种类
 * {String}     cover       书的封面图片链接
 */

router.get('/:author/:name', function(req, res, next) {
    let no = new CheckError(res).check;

    Step(
        function() {
            Book.findOne({
                name: req.params.name,
                author: req.params.author
            }, 'name author open category cover', this);
        },
        function(err, book) {
            if (no(err)) {
                res.status(200).json(book);
            }
        }
    );
});


/**
 * 批量获取书本的信息
 * POST /book
 *
 * @param {[String, String]/[[String, String]]} book    书名
 *          [author, name] / [[author, name]]
 *
 * @response 200 查得书本
 * {[Object]}   bookCollection  书的数组
 * {String}     book.name       书名
 * {String}     book.author     作者
 * {Boolean}    book.open       是否开放
 * {[String]}   book.category   种类
 * {String}     book.cover      书的封面图片链接
 */

router.post('/', paramValidator('book', 'object'), function(req, res, next) {
    let no = new CheckError(res).check;

    Step(
        function() {
            // 如果客户端只以单层数组的格式请求了一本书的信息，则先将该数组转为一个双层数组，
            // 使其与批量请求多个书本的情况共用一套逻辑
            if (req.body.book.length == 1) {
                req.body.book = [req.body.book];
            }
            let group = this.group();
            for (let book of req.body.book) {
                Book.findOne({
                    name: book.name,
                    author: book.author
                }, 'name author open category cover', group());
            }
        },
        function(err, books) {
            if (no(err)) {
                res.status(200).json(books);
            }
        }
    );
});


/**
 * 创建书本
 * POST /book/new
 *
 * @permission 'CreateBook'
 *
 * @param {String}      name        书名
 * @param {String}      author      作者
 * @param {[String]}    category    种类
 * @param {String}      cover       书的封面图片链接
 *
 * @response 201 成功创建图书
 * {Object} book    书本信息
 *
 * @response 400 已有同名图书
 * {String} message 提示信息
 */

router.post('/new', ensureLoggedIn, permittedTo('CreateBook'),
    paramValidator('name', 'author', ['category', 'object'], 'cover'), function(req, res, next) {
    let no = new CheckError(res).check;

    Step(
        function() {
            Book.findOne({
                name: req.body.name,
                author: req.body.author
            }, this);
        },
        function(err, result) {
            if (no(err)) {
                if (result) {
                    res.status(400).json({
                        error: 'DuplicatedBook',
                        message: '已有同名书籍，如仍需添加请联系管理员'
                    });
                } else {
                    this();
                }
            }
        },
        function() {
            let book = new Book({
                name: req.body.name,
                author: req.body.author,
                category: req.body.category,
                cover: req.body.cover
            });
            book.save(this);
        },
        function(err, result) {
            if (no(err)) {
                res.status(201).json(result);
            }
        }
    )
});


/**
 * 修改书本信息
 * PUT /book/:author/:name
 *
 * @permission 'ModifyBookInfo'
 *
 * 以下悉为可选参数
 * @param {String}      name        书名
 * @param {String}      author      作者
 * @param {[String]}    category    种类
 * @param {String}      cover       书的封面图片链接
 *
 * @response 201 已修改
 * {Object} book    书本信息
 *
 * @response 404 未找到书本
 * {String} error   错误名
 * {String} message 错误信息
 */

router.put('/:author/:name', ensureLoggedIn, permittedTo('ModifyBookInfo'), function(req, res, next) {
    let no = new CheckError(res).check;

    Step(
        function() {
            Book.findOne({
                name: req.params.name,
                author: req.params.author
            }, this);
        },
        function(err, book) {
            if (no(err)) {
                if (!book) {
                    res.status(404).json({
                        error: 'BookNotFound',
                        message: 'The book to modify is not found.'
                    });
                } else {
                    let update = {};
                    for (let item of ['name', 'author', 'category', 'cover']) {
                        update[item] = req.body[item] || book[item];
                    }
                    book.update(update, this);
                }
            }
        },
        function(err, info) {
            if (no(err)) {
                res.status(201).json(info);
            }
        }
    );
});

module.exports = router;