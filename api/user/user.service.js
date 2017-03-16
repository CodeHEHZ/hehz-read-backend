/**
 * @file 关于用户的各种服务
 *
 * @function hash(username, mode)
 * @function necessaryInfo(user)
 * @function getSingleUser(username, mode(, givenHash), cb)
 */

let md5 = require('object-hash').MD5,
    Step = require('step'),
    _ = require('lodash'),
    cache = require('../util/cacheSystem'),
    User = require('../schema').User;

let UserService = {
    /**
     * @function hash
     * 根据模式生成用户的 md5 哈希
     *
     * @param username  用户名
     * @param mode      模式('safe'/'original')
     *
     * @return {String} 用户的哈希
     */

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


    /**
     * @function necessaryInfo
     * 剔除不需要的、或用户不能看见的信息
     * 仅保留 'username', 'createdTime', 'group', 'uid', '_id' 字段
     *
     * @param {Object|[Object]} user 用户信息
     *
     * @return {Object|[Object]} 剔除好的用户信息
     */

    necessaryInfo(user) {
        let answer = [];

        if (_.isArray(user)) {
            for (let i = 0; i < user.length; i++) {
                answer[i] = _.pick(user[i], ['username', 'createdTime', 'group', 'uid', '_id']);
            }
        } else {
            answer = _.pick(user, ['username', 'createdTime', 'group', 'uid', '_id']);
        }

        return answer;
    },


    /**
     * @function getSingleUser
     * 获取单个用户的信息
     *
     * @param {String}      username    用户名
     * @param {String}      mode        模式（'safe'/'original'）
     * @param {String}      givenHash   （可选）用户的哈希
     * @param {Function}    cb          回调函数
     *
     * @callback(err, user)
     * {Error}  err     错误信息，如无错则为 null
     * {Object} user    用户信息，如查无则为 null
     */

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
                        User.findByUsername(username, this);
                    }
                } else {
                    cb(err);
                }
            },
            function(err, user) {
                if (!err) {
                    if (!user) {
                        cb({
                            name: 'UserNotFound',
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