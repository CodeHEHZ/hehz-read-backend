/**
 * @file 关于用户的各种服务
 *
 * @function hash(username, mode)
 * @function necessaryInfo(user)
 * @function getSingleUser(username, mode(, givenHash), cb)
 * @function getReadingStatus(username, cb)
 * @function setTag(username, users, tag, action, cb)
 * @function getUserList(username, cb)
 */

let md5 = require('object-hash').MD5,
    Step = require('step'),
    _ = require('lodash'),
    cache = require('../util/cacheSystem'),
    User = require('../schema').User,
    UserTag = require('../schema').UserTag;

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
                return md5(JSON.stringify({ account: [username, 'safe'] }));
                break;
            case 'original':
                return md5(JSON.stringify({ account: username }));
                break;
            default:
                return md5(JSON.stringify({ account: username }));
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
                cb(err, mode === 'safe' ? _safeUser : _user);
            }
        );
    },


    /**
     * @function getReadingStatus
     * 获取用户的读书情况
     *
     * @param {String}      username    用户名
     * @param {Function}    cb          回调函数
     *
     * @callback(err, status)
     * {Error}      err                 错误信息，如无错则为 null
     * {[Object]}   status              用户的阅读状态
     * {String}     status[n].id        书的 MongoDB _id
     * {Number}     status[n].score     用户上次的得分
     * {Boolean}    status[n].pass      用户上次是否通过
     * {Boolean}    status[n].testing   用户现在能否参加测试
     */

    getReadingStatus(username, cb) {
        let _this = this,
            _user,
            _hash = md5(JSON.stringify({ readingStatus: username })),
            _status = [],
            _failedBook = [];

        Step(
            function() {
                cache.get(_hash, this);
            },
            function(err, status) {
                if (err) cb(err);
                else if (status) {
                    cb(null, status);
                } else {
                    _this.getSingleUser(username, 'original', this);
                }
            },
            function(err, user) {
                if (err) cb(err);
                else {
                    _user = user;
                    let group = this.group();
                    for (let test of _user.book) {
                        if (test.pass) {
                            _status.push(test);
                        } else {
                            _failedBook.push(test);
                            let hash = md5(JSON.stringify({ username, book: test.id }));
                            cache.get(hash, group());
                        }
                    }
                }
            },
            function(err, tests) {
                if (err) cb(err);
                else {
                    for (let i = 0; i < _failedBook.length; i++) {
                        if (tests.filter(test => test ? test.book : null === _failedBook[i].id).length > 0)
                            _failedBook[i].cooldown = true;
                    }
                    _status = _.concat(_status, _failedBook);
                    cache.set(_hash, _user._id, _status, this);
                }
            },
            function(err) {
                cb(err, _status);
            }
        );
    },


    /**
     * @function setTag
     * 添加 / 删除用户的标签
     *
     * @param {String}      username    正在设置标签的用户
     * @param {[String]}    users       要为之设置标签用户
     * @param {String}      tag         标签名
     * @param {String}      action      动作（add / pull）
     * @param {Function}    cb          回调函数
     *
     * @callback(err)
     * {Error}  err     错误信息，如无错则为 null
     */

    setTag(username, users, tag, action, cb) {
        let _this = this,
            _user,
            _userGroupToTag = [];

        if (!_.isArray(users))
            users = [users];

        if (!_.isString(username) || !_.isString(tag) || !['add', 'pull'].includes(action) || !_.isFunction(cb)) {
            cb({
                name: 'WrongInput',
                message: 'UserService.addTag：错误的参数'
            });
        }

        Step(
            function() {
                _this.getSingleUser(username, 'original', this);
            },
            function(err, user) {
                if (err) cb(err);
                else {
                    _user = user;
                    switch (_user.group) {
                        case 'admin':
                            _userGroupToTag = ['student', 'teacher', 'manager', 'admin'];
                            this();
                            break;
                        case 'manager':
                            _userGroupToTag = ['student', 'teacher'];
                            this();
                            break;
                        case 'teacher':
                            _userGroupToTag = ['student'];
                            this();
                            break;
                        default:
                            cb({
                                name: 'PermissionDenied',
                                message: '你所在的用户组不能进行这样的操作'
                            });
                    }
                }
            },
            function() {
                if (action === 'add') {
                    UserTag.update({}, {$addToSet: {tag}}, this);
                } else {
                    this();
                }
            },
            function(err) {
                if (err) cb(err);
                else {
                    let act = {};
                    if (action === 'add') {
                        act = {
                            $addToSet: { tag }
                        }
                    } else if (action === 'pull') {
                        act = {
                            $pull: { tag }
                        }
                    }
                    User.update({
                        username: { $in: users },
                        group: { $in: _userGroupToTag }
                    }, act, {
                        multi: true
                    }, this);
                }
            },
            function(err) {
                if (err) cb(err);
                else {
                    cache.update(_user._id, this);
                }
            },
            function(err) {
                if (err) cb(err);
                else {
                    User.update({ _id: _user._id }, { $addToSet: { tagAbleToSee: tag } }, cb);
                }
            }
        );
    },


    /**
     * @function getUserList
     * 获取用户可见的用户列表
     *
     * @param {String}      username    正在查询用户列表的用户
     * @param {Function}    cb          回调函数
     *
     * @callback(err, userList)
     * {Error}      err         错误信息，如无错则为 null
     * {[Object]}   userList    用户列表
     */

    getUserList(username, cb) {
        let _user,
            _hash,
            _this = this;

        Step(
            function() {
                _this.getSingleUser(username, 'original', this);
            },
            function(err, user) {
                if (err) cb(err);
                else {
                    _user = user;
                    if (_user.group === 'admin') {
                        _hash = md5(JSON.stringify({ userList: ['*'] }));
                    } else {
                        _hash = md5(JSON.stringify({ userList: (_user.tagAbleToSee || []).sort() }));
                    }
                    cache.get(_hash, this);
                }
            },
            function(err, userList) {
                if (err) cb(err);
                else {
                    if (userList) {
                        cb(null, userList);
                    } else {
                        if (_user.group === 'admin') {
                            User.find({}, this);
                        } else {
                            let group = this.group();
                            for (let tag of _user.tagAbleToSee) {
                                User.find({ tag }, group());
                            }
                        }
                    }
                }
            },
            function(err, users) {
                if (err) cb(err);
                else {
                    users = _.union(users);
                    let idSet = [_user._id];
                    for (let user of users) {
                        idSet.push(user._id);
                    }
                    cache.set(_hash, idSet, users);
                    cb(null, users);
                }
            }
        );
    }
};

module.exports = UserService;