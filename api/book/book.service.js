/**
 * @file 关于书本的各种服务
 *
 * @function hash(author, name, mode)
 * @function necessaryInfo(book)
 * @function getSingleBook(author, name, mode(, hash), cb)
 * @function openForQuiz(author, name, cb)
 */

let _ = require('lodash'),
    Step = require('step'),
    cache = require('../util/cacheSystem'),
    Book = require('../schema').Book,
    Question = require('../schema').Question,
    QuizService = require('../quiz/quiz.service'),
    md5 = require('object-hash').MD5;

let BookService = {
    /**
     * @function hash
     * 根据模式生成图书的 md5 哈希
     *
     * @param author    作者
     * @param name      书名
     * @param mode      模式('safe'/'original')
     */

    hash(author, name, mode) {
        return mode === 'safe'
            ? md5(JSON.stringify({ book: [author, name, 'safe'] }))
            : md5(JSON.stringify({ book: [author, name] }));
    },


    /**
     * @function necessaryInfo
     * 剔除不需要的、或用户不能看见的信息
     * 仅保留 'name'、'author'、'open'、'category'、'cover'、'description'、'_id' 字段
     *
     * @param {Object|[Object]} book 图书信息
     *
     * @return {Object} 剔除好的图书信息
     */

    necessaryInfo(book) {
        let answer = [];
        if (_.isArray(book)) {
            for (let i = 0; i < book.length; i++) {
                answer[i] = _.pick(book[i], ['name', 'author', 'open', 'category', 'cover', 'description', '_id']);
            }
        } else {
            answer = _.pick(book, ['name', 'author', 'open', 'category', 'cover', 'description', '_id']);
        }
        return answer;
    },


    /**
     * @function getSingleBook
     * 获取一本书的信息
     *
     * @param author    作者
     * @param name      书名
     * @param mode      获取格式，safe 为剔除过信息的，original 为原封不动的
     * @param hash      [作者, 书名] 的 md5 哈希（如没有可直接填回调函数 cb）
     * @param cb        回调函数
     *
     * @callback(err, book)
     * {Error}  err     错误信息，如无错则为 null
     * {Object} book    书本信息
     */

    getSingleBook(author, name, mode, hash, cb) {
        let _this = this,
            _safeBook,
            _book;

        // 分情况哈希
        if (_.isFunction(hash)) {
            cb = hash;
            hash = _this.hash(author, name, mode);
        }

        Step(
            // 先看看缓存中有没有
            function() {
                cache.get(hash, this);
            },
            function(err, book) {
                if (!err) {
                    // 有的话就直接返回
                    if (book) {
                        cb(null, book);
                    } else {
                        this();
                    }
                } else {
                    cb(err);
                }
            },
            // 没有的话就在数据库中找
            function(err) {
                if (!err) {
                    Book.findOne({
                        name,
                        author
                    }, this);
                }
            },
            // 找到了先写入缓存
            function(err, book) {
                if (!err) {
                    if (book) {
                        _book = book;
                        _safeBook = _this.necessaryInfo(_book);
                        let group = this.group();
                        // 这段写得好恶心...
                        if (mode == 'safe') {
                            cache.set(hash, _book._id, _safeBook, group());
                            cache.set(_this.hash(author, name, 'original'), _book._id, book, group());
                        } else {
                            cache.set(hash, _book._id, _book, group());
                            cache.set(_this.hash(author, name, 'safe'), _book._id, _safeBook, group());
                        }
                    } else {
                        cb({
                            name: 'BookNotFound',
                            message: 'The book you look for doesn\'t exist.'
                        });
                    }
                } else {
                    cb(err);
                }
            },
            function(err) {
                cb(err, mode == 'safe'
                    ? _safeBook
                    : _book);
            }
        );
    },


    /**
     * @function openForQuiz
     * 将一本书开放测试
     *
     * 开放测试要求一本书至少有 25 道题
     *
     * @param {String}      author      作者（或书的 MongoDB _id）
     * @param {String}      name        书名（若在上一栏填了 MongoDB _id 则为可选）
     * @param {Function}    cb          回调函数
     *
     * @callback(err, message)
     * {Error}  err     错误信息，如无错则为 null
     * {String} message 提示信息
     */

    openForQuiz(author, name, cb) {
        let _this = this,
            _book;

        if (_.isFunction(name) && !cb) {
            cb = name;
        }

        let questionSets = [[]];

        Step(
            // 如果 author 是个 MongoDB _id，就先看看有没有对应的书本
            function() {
                if (/^[a-f\d]{24}$/i.test(author)) {
                    Book.findById(author, this);
                } else {
                    this();
                }
            },
            // 没有的话就正常地查找
            function(err, book) {
                if (err) cb(err);
                else {
                    if (book) {
                        this(null, book);
                    } else {
                        _this.getSingleBook(author, name, 'original', this);
                    }
                }
            },
            // 看看对应这本书的题目有多少
            function(err, book) {
                if (err) cb(err);
                else {
                    _book = book;
                    Question.find({ book: book._id, open: true }, this);
                }
            },
            // 开始出测试
            function(err, questions) {
                if (err) cb(err);
                else {
                    // 问题总量不得少于 25 道
                    if (questions.length <= 25) {
                        cb({
                            name: 'TooFewQuestions',
                            message: 'There must be more than 25 questions for an open book.'
                        });
                    } else {
                        // 这段过一个礼拜我肯定就看不懂了
                        let group = this.group();
                        // 循环 20 次来建 20 个测试
                        for (let i = 0; i < 20; i++) {
                            let questionSet,
                                setsLock = 1;

                            while(setsLock) {
                                questionSet = [];
                                // 循环 20 次来挑出 20 道题
                                for (let n = 0; n < 20; n++) {
                                    let setLock = 1,
                                        index;
                                    while (setLock) {
                                        index = Math.floor(Math.random() * questions.length);
                                        index = index === questions.length ? (questions.length - 1) : index;
                                        // 如果这个测试里已经有同样的问题，那就再随机一次
                                        setLock = questionSet.includes(questions[index]._id) ? 1 : 0;
                                    }
                                    questionSet.push(questions[index]._id);
                                }
                                questionSet = questionSet.sort((a, b) => a - b);
                                // 如果这本书里已经有同样的测试，那就再随机一次
                                setsLock = questionSets.includes(questionSet) ? 1 : 0;
                            }

                            questionSets[i] = questionSet;
                            QuizService.createQuiz(_book._id, questionSet, group());
                        }
                    }
                }
            },
            function(err, quiz) {
                if (err) cb(err);
                else {
                    for (let i = 0; i < quiz.length; i++) {
                        quiz[i] = quiz[i]._id;
                    }
                    Book.update({ _id: _book._id }, { $set: {
                        quiz,
                        open: true
                    } }, this);
                }
            },
            function(err) {
                if (err) cb(err);
                cache.update(_book._id, this);
            },
            function(err) {
                cb(err, {
                    message: 'Success'
                });
            }
        );
    }
};

module.exports = BookService;