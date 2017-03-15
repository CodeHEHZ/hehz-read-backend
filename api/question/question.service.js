let Step = require('step'),
    _ = require('lodash'),
    cache = require('../util/cacheSystem'),
    md5 = require('object-hash').MD5,
    Question = require('../schema').Question;

let QuestionService = {
    hash(id, mode) {
        return mode == 'safe'
            ? md5([id, 'safe'])
            : md5(id);
    },

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

    getSingleQuestion(id, mode, cb) {
        let _this = this,
            _question,
            _safeQuestion,
            _hash,
            _safeHash;

        if (mode == 'safe') {
            _safeHash = hash(id, 'safe');
        } else {
            _hash = hash(id);
        }

        Step(
            function() {
                cache.get(_hash || _safeHash, this);
            },
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
            function(err, question) {
                if (!err) {
                    if (question) {
                        _question = question;
                        _safeQuestion = _this.necessaryInfo(_question);
                        let group = this.group();
                        if (mode == 'safe') {
                            cache.set(_safeHash, _question._id, _safeQuestion, group());
                            cache.set(hash(id), _question._id, _question, group());
                        } else {
                            cache.set(_hash, _question._id, _question, group());
                            cache.set(hash(id, 'safe'), _question._id, _safeQuestion, group());
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
            function(err) {
                cb(err, mode == 'safe' ? _safeQuestion : _question);
            }
        );
    }
};

module.exports = QuestionService;