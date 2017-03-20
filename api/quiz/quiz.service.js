/**
 * @file 关于测试的各种服务
 *
 * @function hash(id, mode)
 * @function necessaryInfo(quiz)
 * @function getQuiz(id, mode(, givenHash), cb)
 * @function createQuiz(book, questionSet, cb)
 */

let md5 = require('object-hash').MD5,
    Step = require('step'),
    _ = require('lodash'),
    cache = require('../util/cacheSystem'),
    QuestionService = require('../question/question.service'),
    Book = require('../schema').Book,
    Quiz = require('../schema').Quiz;

let QuizService = {
    /**
     * @function hash
     * 根据模式生成测试的 md5 哈希
     *
     * @param {String}  id      测试的 MongoDB _id
     * @param {String}  mode    获取测试的模式('safe'|'original')
     *
     * @returns {String}        生成的哈希
     */

    hash(id, mode) {
        switch (mode) {
            case 'safe':
                return md5({ quiz: [id, 'safe'] });
                break;
            case 'original':
                return md5({ quiz: id });
                break;
            default:
                return md5({ quiz: id });
        }
    },


    /**
     * @function necessaryInfo
     * 除去测试中的答案
     *
     * @param {Object|[Object]} quiz        测试
     * @returns {Object|[Object]}           除去了答案的测试
     */

    necessaryInfo(quiz) {
        let answer = [];
        if (_.isArray(quiz)) {
            for (let i = 0; i < quiz.length; i++) {
                answer[i] = {
                    _id: quiz[i]._id,
                    book: quiz[i].book,
                    question: generateSafeQuestionObject(quiz[i].question)
                };
            }
        } else {
            answer = {
                _id: quiz._id,
                book: quiz.book,
                question: generateSafeQuestionObject(quiz.question)
            };
        }
        return answer;
    },


    /**
     * @function getQuiz
     * 获取测试的信息
     *
     * @param {String}      id          测试的 MongoDB _id
     * @param {String}      mode        模式（'safe'/'original'）
     * @param {String}      givenHash   （可选）已有的哈希
     * @param {Function}    cb          回调函数
     *
     * @callback(err, quiz)
     * {Error}  err     错误信息，如无错则为 null
     * {Object} quiz    查找到的测试
     */

    getQuiz(id, mode, givenHash, cb) {
        let _hash,
            _quiz,
            _safeHash,
            _safeQuiz,
            _this = this;

        if (!cb && _.isFunction(givenHash)) {
            cb = givenHash;
        }

        Step(
            // 先通过 givenHash 查找缓存
            function() {
                if (_.isFunction(givenHash)) {
                    next();
                } else {
                    cache.get(givenHash, this);
                }
            },
            // 没有的话就生成哈希，再查查缓存
            function(err, quiz) {
                if (err) cb(err);
                else {
                    if (quiz) {
                        cb(null, quiz);
                    } else {
                        switch (mode) {
                            case 'safe':
                                _safeHash = _this.hash(id, mode);
                                break;
                            case 'original':
                                _hash = _this.hash(id, mode);
                                break;
                            default:
                                _safeHash = _this.hash(id, 'safe');
                        }
                        cache.get(_hash || _safeHash, this);
                    }
                }
            },
            // 要是还没有就直接找数据库
            function(err, quiz) {
                if (err) cb(err);
                else {
                    if (quiz) {
                        cb(null, quiz);
                    } else {
                        Quiz.findById(id, this);
                    }
                }
            },
            // 找到了就接着找测试里的题目
            function(err, quiz) {
                if (err) cb(err);
                else {
                    if (quiz) {
                        _quiz = quiz;
                        let group = this.group();
                        for (let question of _quiz.question) {
                            QuestionService.getSingleQuestion(question, 'original', group());
                        }
                    } else {
                        cb({
                            name: 'QuizNotFound',
                            message: 'The quiz you look for doesn\'t exist.'
                        });
                    }
                }
            },
            // 将结果存入缓存
            function(err, questions) {
                if (err) cb(err);
                else {
                    _quiz.question = questions;
                    _safeQuiz = _this.necessaryInfo(_quiz);
                    for (let index in questions) {
                        questions[index] = questions._id;
                    }
                    let group = this.group();
                    cache.set(_hash || _this.hash(id, 'original'), questions, _quiz, group());
                    cache.set(_safeHash || _this.hash(id, 'safe'), questions, _safeQuiz, group());
                }
            },
            function(err) {
                cb(err, mode == 'safe' ? _safeQuiz : _quiz);
            }
        );
    },


    /**
     * @function createQuiz
     * 创建测试
     *
     * @param {String}      book        书本的 MongoDB _id
     * @param {[String]}    questionSet 题目的 MongoDB _id
     * @param {Function}    cb          回调函数
     *
     * @callback(err, result)
     * {Error}  err     错误信息，如无错则为 null
     * {Object} result  创建出的测试
     */

    createQuiz(book, questionSet, cb) {
        let quiz,
            quizInfo = {
                book,
                question: []
            };

        Step(
            // 先看看有没有这本书
            function() {
                Book.findById(book, this);
            },
            function(err, result) {
                if (err) cb(err);
                else {
                    if (result) {
                        this();
                    } else {
                        cb({
                            name: 'BookNotFound',
                            message: 'The book to modify is not found.'
                        });
                    }
                }
            },
            // 再看看有没有这些题
            function(err) {
                if (err) cb(err);
                else {
                    questionSet = questionSet.sort();
                    let group = this.group();
                    for (let question of questionSet) {
                        QuestionService.getSingleQuestion(question, 'original', group());
                    }
                }
            },
            // 每道题还要确定属于这本书
            function(err, questions) {
                if (err) cb(err);
                else {
                    let lock = 0;
                    for (let question of questions) {
                        if (question.book != book) {
                            cb({
                                name: 'UnacceptableQuestion',
                                message: 'The question doesn\'t belong to this book.'
                            });
                            lock = 1;
                            break;
                        } else {
                            quizInfo.question.push({
                                id: question._id,
                                answer: question.answer
                            });
                        }
                    }

                    // 看看有没有重复的测试
                    if (!lock) {
                        Quiz.findOne({question: quizInfo.question}, this);
                    }
                }
            },
            // 创建题目
            function(err, result) {
                if (err) cb(err);
                else {
                    if (result) {
                        cb(null, result);
                    } else {
                        quiz = new Quiz(quizInfo);
                        quiz.save(this);
                    }
                }
            },
            function(err) {
                if (err) cb(err);
                else {
                    cb(null, quiz);
                }
            }
        );
    }
};


/**
 * @function generateSafeQuestionObject
 * @param {[Object]} question   问题
 * @returns {[Object]}  删去答案的问题
 */

function generateSafeQuestionObject(question) {
    let _question = [];

    for (let n = 0; n < question.length; n++) {
        _question[n] = {
            id: question[n].id,
            question: question[n].question,
            difficulty: question[n].difficulty
        };

        if (question[n].option) {
            _question[n].option = question[n].option;
        }
    }

    return _question;
}

module.exports = QuizService;