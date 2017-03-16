

let md5 = require('object-hash').MD5,
    Step = require('step'),
    _ = require('lodash'),
    cache = require('../util/cacheSystem'),
    CheckError = require('../util/checkError'),
    Account = require('../schema').Account;

let UserService = {
    hash(username, mode) {
        switch (mode) {
            case 'safe':
                return md5({ account: [username, 'safe'] });
                break;
            case 'original':
                return md5({ account: username });
                break;
            default:
                return md5({ account: username });
        }
    },

    necessaryInfo(user) {
        let answer = [];

        if (_.isArray(user)) {
            for (let i = 0; i < user.length; i++) {
                answer[i] = _.pick(user[i], ['username', 'createdTime', 'group', 'studentId', '_id']);
            }
        } else {
            answer = _.pick(user, ['username', 'createdTime', 'group', 'studentId', '_id']);
        }

        return answer;
    },

    getSingleUser(username, mode, givenHash, cb) {
        let _this = this,
            _hash,
            _user,
            _safeHash,
            _safeUser;

        if (!cb && _.isFunction(givenHash)) {
            cb = givenHash;
        }

        Step(
            function() {
                if (!_.isFunction(givenHash)) {
                    cache.get(givenHash, this);
                } else {
                    this();
                }
            },
            function(err, user) {
                if (!err) {
                    if (user) {
                        cb(null, user);
                    } else {
                        switch (mode) {
                            case 'safe':
                                _safeHash = _this.hash(username, 'safe');
                                break;
                            case 'original':
                                _hash = _this.hash(username, 'original');
                                break;
                            default:
                                cb({
                                    name: 'IncorrectMode',
                                    message: 'The mode you fill in has to be either \'safe\' or \'original\'.'
                                });
                        }
                        cache.get(_hash || _safeHash, this);
                    }
                } else {
                    cb(err);
                }
            },
            function(err, user) {
                if (!err) {
                    if (user) {
                        cb(null, user);
                    } else {
                        Account.findByUsername(username, this);
                    }
                } else {
                    cb(err);
                }
            },
            function(err, user) {
                if (!err) {
                    if (!user) {
                        cb({
                            name: 'AccountNotFound',
                            message: 'The account doesn\'t exist.'
                        });
                    } else {
                        _user = user;
                        _safeUser = _this.necessaryInfo(_user);
                        let group = this.group();
                        cache.set(_hash || _this.hash(username, 'original'), _user._id, _user, group());
                        cache.set(_safeHash || _this.hash(username, 'safe'), _user._id, _safeUser, group());
                    }
                } else {
                    cb(err);
                }
            },
            function(err) {
                cb(err, mode == 'safe' ? _safeUser : _user);
            }
        );
    }
};

module.exports = UserService;