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
    paramValidator = require('../util/paramValidator.middleware'),
    cache = require('../util/cacheSystem'),
    BookService = require('./book.service'),
    Book = require('../schema').Book,
    md5 = require('object-hash').MD5,
    _ = require('lodash');


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

router.get('/:author/:name', function(req, res) {
    let no = new CheckError(res).check;

    Step(
        function() {
            BookService.getSingleBook(req.params.author, req.params.name, 'safe', this);
        },
        function(err, book) {
            if (no(err)) {
                res.status(200).json(BookService.necessaryInfo(book));
            }
        }
    );
});


/**
 * 批量获取书本的信息
 * POST /book
 *
 * @param {Object|[Object]} book    书名
 *         Object: { name: String, author: String }
 *
 * @response 200 查得书本
 * {[Object]}   bookCollection  书的数组
 * {String}     book.name       书名
 * {String}     book.author     作者
 * {Boolean}    book.open       是否开放
 * {[String]}   book.category   种类
 * {String}     book.cover      书的封面图片链接
 */

router.post('/', paramValidator(['book', 'object']), function(req, res, next) {
    let no = new CheckError(res).check;

    // 如果客户端只以对象的格式请求了一本书的信息...
    if (req.body.book.author) {
        Step(
            function() {
                BookService.getSingleBook(req.body.book.author, req.body.book.name, 'safe', this);
            },
            function(err, book) {
                if (no(err)) {
                    res.status(200).json(BookService.necessaryInfo(book));
                }
            }
        );
    // 不然的话...
    } else {
        req.body.book = req.body.book.sort();
        let _safeHash = md5({ book: [req.body.book, 'safe'] }),
            _safeBooks,
            _hash;

        Step(
            function() {
                cache.get(_safeHash, this);
            },
            function(err, result) {
                if (no(err)) {
                    if (result) {
                        res.status(200).json(result);
                    } else {
                        _hash = md5({ book: req.body.book });
                        cache.get(_hash, this);
                    }
                }
            },
            function(err, result) {
                if (no(err)) {
                    if (result) {
                        res.status(200).json(result);
                    } else {
                        let group = this.group();
                        for (let book of req.body.book) {
                            BookService.getSingleBook(book.author, book.name, 'original', group());
                        }
                    }
                }
            },
            function(err, books) {
                if (no(err)) {
                    _safeBooks = BookService.necessaryInfo(books);
                    let idSet = [];
                    for (let i = 0; i < books.length; i++) {
                        idSet[i] = books[i]._id;
                    }

                    let group = this.group();
                    cache.set(_hash, idSet, books, group());
                    cache.set(_safeHash, idSet, _safeBooks, group());
                }
            },
            function(err) {
                if (no(err)) {
                    res.status(200).json(_safeBooks);
                }
            }
        );
    }
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
 * {String} message 提示信息
 *
 * @response 404 未找到书本
 * {String} error   错误名
 * {String} message 错误信息
 */

router.put('/:author/:name', ensureLoggedIn, permittedTo('ModifyBookInfo'), function(req, res, next) {
    let no = new CheckError(res).check,
        _book;

    Step(
        // 先找书
        function() {
            BookService.getSingleBook(req.params.author, req.params.name, 'original', this);
        },
        // 找到了就先清空书的相关缓存
        function(err, book) {
            if (no(err)) {
                if (!book) {
                    res.status(404).json({
                        error: 'BookNotFound',
                        message: 'The book to modify is not found.'
                    });
                } else {
                    _book = book;
                    cache.update(_book._id, this);
                    this();
                }
            }
        },
        // 更新数据库中书的信息
        function(err) {
            if (no(err)) {
                let update = {};
                for (let item of ['name', 'author', 'category', 'cover']) {
                    update[item] = req.body[item] || _book[item];
                }
                Book.update({ _id: _book._id }, { $set: update }, this);
            }
        },
        function(err) {
            if (no(err)) {
                res.status(201).json({
                    message: 'Modified.'
                });
            }
        }
    );
});

module.exports = router;