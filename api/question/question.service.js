/**
 * @file 关于题目的各种服务
 *
 * @function hash(id, mode)
 * @function necessaryInfo(question)
 * @function getSingleQuestion(id, mode(, givenHash), cb)
 */

let Step = require('step'),
    _ = require('lodash'),
    cache = require('../util/cacheSystem'),
    md5 = require('object-hash').MD5,
    Question = require('../schema').Question;

let QuestionService = {
    /**
     * @function hash
     * 根据模式生成题目的 md5 哈希
     *
     * @param {String}  id      题目的 MongoDB _id
     * @param {String}  mode    获取题目的模式('safe'|'original')
     * @returns {String}        生成的哈希
     */

    hash(id, mode) {
        switch (mode) {
            case 'safe':
                return md5({ question: [id, 'safe'] });
                break;
            case 'original':
                return md5({ question: id });
                break;
            default:
                return md5({ question: id });
        }
    },


    /**
     * @function necessaryInfo
     * 除去题目中的答案
     *
     * @param {Object|[Object]} question    题目
     * @returns {Object|[Object]}           除去了答案的题目
     */

    necessaryInfo(question) {
        let answer = [];
        if (_.isArray(question)) {
            for (let i = 0; i < question.length; i++) {
                answer[i] = _.pick(question[i], ['question', 'option']);
            }
        } else {
            answer = _.pick(answer, ['question', 'option']);
        }

        return answer;
    },


    /**
     * @function getSingleQuestion
     * 获取单个题目
     *
     * @param {String}      id          题目的 MongoDB _id
     * @param {String}      mode        获取题目的模式('safe'|'original')
     * @param {String}      givenHash   （可选）题目 _id 的哈希
     * @param {Function}    cb          回调函数
     *
     * @callback(err, question)
     * {Error}  err         错误信息，如无错则为 null
     * {Object} question    题目，如未找到则为 null
     */

    getSingleQuestion(id, mode, givenHash, cb) {
        let _this = this,
            _question,
            _safeQuestion,
            _hash,
            _safeHash;

        // 如果没有提供 givenHash，则将 givenHash 设为回调函数
        if (_.isFunction(givenHash)) {
            cb = givenHash;
        }

        Step(
            // 先看看用户提供的 Hash 能不能从缓存中找到东西
            function() {
                if (!_.isFunction(givenHash)) {
                    cache.get(givenHash, this);
                } else {
                    this();
                }
            },
            // 找得到就返回，找不到就根据模式查询缓存
            function(err, question) {
                if (!err) {
                    if (question) {
                        cb(null, question)
                    } else {
                        cache.get(_hash || _safeHash, this);
                    }
                }
            },
            // 还是找不到，就从数据库中找
            function(err, question) {
                if (!err) {
                    if (question) {
                        cb(null, question);
                    } else {
                        Question.findById(id, this);
                    }
                } else {
                    cb(err);
                }
            },
            // 如果找得到就写入缓存
            function(err, question) {
                if (!err) {
                    if (question) {
                        _question = question;
                        _safeQuestion = _this.necessaryInfo(_question);
                        let group = this.group();
                        if (mode == 'safe') {
                            cache.set(_safeHash, _question._id, _safeQuestion, group());
                            cache.set(_this.hash(id, 'original'), _question._id, _question, group());
                        } else {
                            cache.set(_hash, _question._id, _question, group());
                            cache.set(_this.hash(id, 'safe'), _question._id, _safeQuestion, group());
                        }
                    } else {
                        cb({
                            name: 'QuestionNotFound',
                            message: 'The question you look for doesn\'t exist.'
                        });
                    }
                } else {
                    cb(err);
                }
            },
            // 根据模式返回
            function(err) {
                cb(err, mode == 'safe' ? _safeQuestion : _question);
            }
        );
    }
};

module.exports = QuestionService;