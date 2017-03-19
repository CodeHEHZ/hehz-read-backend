/**
 * @file 关于测试的各种服务
 *
 * @function hash(id, mode)
 */

let md5 = require('object-hash').MD5,
    Step = require('step'),
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

module.exports = QuizService;