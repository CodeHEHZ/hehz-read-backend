/**
 * @file 图书接口
 * @author IncredibLink(incrediblelink@gmail.com)
 *
 * 获取单个书本的信息：GET  /book/:author/:name
 * 批量获取书本的信息：POST /book
 * 获取书单：GET /book/list
 * 创建书本：POST /book/new
 * 修改书本信息：PUT /book/:author/:name
 * 获取书本的所有题目：GET /book/:author/:name/question
 * 开放书本：GET  /book/:author/:name/open
 * 关闭书本：GET  /book/:author/:name/close
 * 开始测试：GET  /book/:author/:name/quiz
 * 提交测试：POST /book/:author/:name/quiz
 */

let express = require('express'),
    router = express.Router(),
    Step = require('step'),
    CheckError = require('../util/checkError'),
    ensureLoggedIn = require('../util/ensureLoggedIn.middleware'),
    permittedTo = require('../util/permittedTo.middleware'),
    paramValidator = require('../util/paramValidator.middleware'),
    cache = require('../util/cacheSystem'),
    QuizService = require('../quiz/quiz.service'),
    BookService = require('./book.service'),
    Book = require('../schema').Book,
    Question = require('../schema').Question,
    User = require('../schema').User,
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
 * {String}     description 简介
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
 * {[Object]}   bookCollection      书的数组
 * {String}     book.name           书名
 * {String}     book.author         作者
 * {Boolean}    book.open           是否开放
 * {[String]}   book.category       书的标签
 * {String}     book.description    简介
 * {String}     book.cover          书的封面图片链接
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
 * 获取书单
 * GET /book/list
 *
 * @response 200 成功获取书单
 * {[Object]}   bookList                书单
 * {String}     bookList[n].name        书名
 * {String}     bookList[n].author      作者
 * {String}     bookList[n].cover       书的封面图片链接
 * {String}     bookList[n].category    书的标签
 * {String}     bookList[n].description 书的简介
 * {Boolean}    bookList[n].open        是否开放
 */

router.get('/list', function(req, res) {
    let no = new CheckError(res).check;

    Step(
        function() {
            cache.get('cache: bookList', this);
        },
        function(err, bookList) {
            if (no(err)) {
                if (bookList) {
                    res.status(200).json(bookList);
                } else {
                    Book.find({}, 'name author cover category open description', this);
                }
            }
        },
        function(err, bookList) {
            if (no(err)) {
                res.status(200).json(bookList);
                cache.set('cache: bookList', bookList);
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
 * @param {String}      description 简介
 *
 * @response 201 成功创建图书
 * {Object} book    书本信息
 *
 * @response 400 已有同名图书
 * {String} message 提示信息
 */

router.post('/new', ensureLoggedIn, permittedTo('CreateBook'),
    paramValidator('name', 'author', ['category', 'object'], 'cover', 'description'), function(req, res, next) {
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
                cover: req.body.cover,
                description: req.body.description
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
 * @param {String}      description 简介
 * @param {String}      id          书的 MongoDB _id（当修改书名和作者名时需要）
 *
 * @response 201 已修改
 * {String} message 提示信息
 *
 * @response 404 未找到书本
 * {String} error   错误名
 * {String} message 错误信息
 */

router.put('/:author/:name', ensureLoggedIn, permittedTo('ModifyBookInfo'), function(req, res) {
    let no = new CheckError(res).check,
        _book;

    Step(
        // 先找书
        function() {
            if (req.body.id) {
                Book.findById(req.body.id, this);
            } else {
                BookService.getSingleBook(req.params.author, req.params.name, 'original', this);
            }
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
                }
            }
        },
        // 更新数据库中书的信息
        function(err) {
            if (no(err)) {
                let update = {};
                for (let item of ['name', 'author', 'category', 'cover', 'description']) {
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


/**
 * 获取书本的所有题目
 * GET /book/:author/:name/question
 *
 * @permission 'CreateQuestion'
 *
 * @response 200 成功获取所有题目
 * {[Object]}   question    所有题目
 */

router.get('/:author/:name/question', ensureLoggedIn, permittedTo('CreateQuestion'), function(req, res) {
    let no = new CheckError(res).check,
        _book,
        hash = md5({ questionCollection: [req.params.author, req.params.name] });

    Step(
        function() {
          cache.get(hash, this);
        },
        function(err, questionCollection) {
            if (no(err)) {
                if (questionCollection)
                    res.status(200).json(questionCollection);
                else
                    BookService.getSingleBook(req.params.author, req.params.name, 'safe', this);
            }
        },
        function(err, book) {
            if (no(err)) {
                _book = book;
                Question.find({ book: _book._id }, this);
            }
        },
        function(err, questionCollection) {
            if (no(err)) {
                res.status(200).json({ question: questionCollection });
                cache.set(hash, _book._id, { question: questionCollection }, () => {});
            }
        }
    );
});


/**
 * 开放书本
 * GET /book/:author/:name/open
 *
 * @permission 'OpenQuiz'
 *
 * @param {String}  name    书名
 * @param {String}  author  作者
 *
 * @response 201 成功开放书本
 * {String} message 提示信息
 */

router.get('/:author/:name/open', ensureLoggedIn, permittedTo('OpenQuiz'), function(req, res) {
    let no = new CheckError(res).check;

    Step(
        function() {
            BookService.openForQuiz(req.params.author, req.params.name, this);
        },
        function(err) {
            if (no(err)) {
                res.status(201).json({
                    message: 'Success.'
                });
            }
        }
    );
});


/**
 * 关闭书本
 * GET /book/:author/:name/close
 *
 * @permission 'OpenQuiz'
 *
 * @param {String}  name    书名
 * @param {String}  author  作者
 *
 * @response 201 成功关闭书本
 * {String} message 提示信息
 */

router.get('/:author/:name/close', ensureLoggedIn, permittedTo('OpenQuiz'), function(req, res) {
    let no = new CheckError(res).check,
        _book;

    Step(
      function() {
          Book.findOne({ author: req.params.author, name: req.params.name }, this);
      },
      function(err, book) {
          if (no(err)) {
              if (book) {
                  _book = book;
                  book.update({ $set: { open: false } }, this);
              } else {
                  res.status(404).json({
                      error: 'BookNotFound',
                      message: '未找到您想要开放的书籍'
                  });
              }
          }
      },
      function(err) {
          if (no(err)) {
              cache.update(_book._id, this);
          }
      },
      function(err) {
          if (no(err)) {
              res.status(201).json({
                  message: 'Success.'
              });
          }
      }
    );
});

/**
 * 开始测试
 * GET /book/:author/:name/quiz
 *
 * @permission 'TakeTest'
 *
 * @param {String}  name    书名
 * @param {String}  author  作者
 *
 * @response 200 开始测试
 * {Object} quiz        测试信息
 * {Number} timestamp   开始测试的时间戳
 * {Number} timeLimit   时间限制（秒）
 */

router.get('/:author/:name/quiz', ensureLoggedIn, permittedTo('TakeTest'), function(req, res){
    let no = new CheckError(res).check,
        _hash,
        _tempHash,
        _book,
        _quiz,
        timeLimit = 330000,
        cooldown = 172800000;

    Step(
        function() {
            BookService.getSingleBook(req.params.author, req.params.name, 'original', this);
        },
        function(err, book) {
            if (no(err)) {
                _book = book;
                if (book.open) {
                    _tempHash = md5(JSON.stringify({
                        username: req.user.username,
                        book: _book._id,
                        test: 1
                    }));
                    cache.get(_tempHash, this);
                } else {
                    res.status(400).json({
                        error: 'BookNotOpenForQuiz',
                        message: '这本书还未开放测试'
                    });
                }
            }
        },
        function(err, testing) {
            if (no(err)) {
                if (testing) {
                    Step(
                        function() {
                            QuizService.getQuiz(testing.quiz, 'safe', this);
                        },
                        function(err, quiz) {
                            if (no(err)) {
                                res.status(200).json({
                                    quiz,
                                    deadline: testing.deadline
                                });
                            }
                        }
                    );
                } else {
                    _hash = md5(JSON.stringify({ username: req.user.username, book: _book._id }));
                    cache.get(_hash, this);
                }
            }
        },
        function(err, tested) {
            if (no(err)) {
                if (tested) {
                    res.status(400).json({
                        error: 'TakingQuizTooFrequently',
                        message: '你在上次考过这本书后需过两天才能再次考试'
                    });
                } else {
                    QuizService.getQuiz(_book.quiz[Math.floor(Math.random() * _book.quiz.length)], 'safe', this);
                }
            }
        },
        function(err, quiz) {
            if (no(err)) {
                _quiz = quiz;
                let group = this.group();

                // 330 seconds = 5.5 minutes
                cache.set(_tempHash, _tempHash, { quiz: quiz._id, deadline: Date.now() + timeLimit - 30000 }, timeLimit, group());
                // 172800 seconds = 2 days
                cache.set(_hash, [], { quiz: quiz._id }, cooldown, group());
            }
        },
        function(err) {
            if (no(err)) {
                res.status(200).json({
                    quiz: _quiz,
                    deadline: Date.now() + timeLimit - 30000
                });
            }
        }
    );
});


/**
 * 提交测试
 * POST /book/:author/:name/quiz
 *
 * @permission 'TakeTest'
 *
 * @param {String}  name                书名
 * @param {String}  author              作者
 * @param {String}  quiz                测试的 MongoDB _id
 * @param {Object}  answer              用户的答案
 * @param {String}  answer[question ID] 每道题对应的答案
 *
 * @response 200 提交成功
 * {Number}     score       成绩
 * {Boolean}    pass        是否通过
 * {String}     message     提示消息
 */

router.post('/:author/:name/quiz', ensureLoggedIn, permittedTo('TakeTest'),
    paramValidator('quiz', 'answer'), function(req, res) {
    let no = new CheckError(res).check,
        tempHash,
        score = 0,
        pass = false,
        _book;

    Step(
        function() {
            BookService.getSingleBook(req.params.author, req.params.name, 'safe', this);
        },
        function(err, book) {
            if (no(err)) {
                _book = book;
                tempHash = md5({
                    username: req.user.username,
                    book: book._id,
                    test: 1
                });
                cache.get(tempHash, this);
            }
        },
        function(err, quiz) {
            if (no(err)) {
                if (!quiz) {
                    res.status(400).json({
                        error: 'QuizExpiredOrNotTaken',
                        message: 'Quiz expired or not even taken.'
                    });
                } else {
                    QuizService.getQuiz(quiz._id, 'original', this);
                }
            }
        },
        function(err, quiz) {
            if (no(err)) {
                for (let i = 0; i < quiz.question.length; i++) {
                    if (req.body.answer[i] && req.body.answer[i] === quiz.question[i].answer) {
                        score += 5;
                    }
                }

                if (score >= 90) {
                    pass = true;
                    User.findByUsername(req.user.username, this);
                } else {
                    res.status(200).json({
                        score,
                        pass,
                        message: '很遗憾，未能通过测试。请在两天后再次挑战'
                    });
                }
            }
        },
        function(err, user) {
            if (no(err)) {
                user.update({ $addToSet: { book: _book._id } }, this);
            }
        },
        function(err) {
            if (no(err)) {
                res.status(200).json({
                    score,
                    pass,
                    message: '恭喜，通过本书测试'
                });
            }
        }
    );
});

module.exports = router;