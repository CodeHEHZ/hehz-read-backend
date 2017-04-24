/**
 * @file 用户接口
 * @author IncredibLink(incrediblelink@gmail.com)
 *
 * 注册：POST /register
 * 登录：POST /login
 * 登出：GET  /logout
 * 更改密码：PUT /password
 * 获取用户信息：GET /:username
 * 修改用户所属的用户组：PUT /:username/group
 * 修改用户信息（除用户组）：PUT /:username
 * 获取读书情况：GET /:username/status
 */

let express = require('express'),
    router = express.Router(),
    Step = require('step'),
    ensureLoggedIn = require('../util/ensureLoggedIn.middleware'),
    passport = require('passport'),
    User = require('../schema').User,
    GroupService = require('../group/group.service'),
    UserService = require('./user.service'),
    cache = require('../util/cacheSystem'),
    permittedTo = require('../util/permittedTo.middleware'),
    CheckError = require('../util/checkError'),
    captchaValidator = require('../util/captchaValidator.middleware');


router.get('/', ensureLoggedIn, function(req, res) {
    res.status(200).cookie('user', req.user).json(req.user);
});


/**
 * 注册用户
 * POST /user/register
 * @param {String}  username    用户名
 * @param {String}  schoolId    学号
 * @param {String}  group       用户组，默认为 student
 * @param {String}  password    密码
 *
 * @response 201 注册成功
 * {String} username    用户名
 * {String} group       用户组
 * {Date}   createdTime 创建时间
 */

router.post('/register', function(req, res) {
    let no = new CheckError(res).check;
    
    Step(
        function() {
            let user = {
                username: req.body.username,
                schoolId: req.body.id,
                group: req.body.group
            };
            User.register(new User(user), req.body.password, this);
        },
        function(err, user) {
            if (no(err)) {
                res.status(201).json({
                    username: user.username,
                    group: user.group,
                    createdTime: user.createdTime
                });
            }
        }
    );
});


/**
 * 登录
 * POST /user/login
 *
 * @param {String} username 用户名
 * @param {String} password 密码
 *
 * @response 200 登录成功
 * {String} username    用户名
 * 同时给用户发去一个 session，session 存储于 Redis 中。
 */

router.post('/login', captchaValidator, passport.authenticate('local'), function(req, res) {
    res.status(200).cookie('user', {
        _id: req.user._id,
        username: req.user.username,
        group: req.user.group
    }, {
        maxAge: 604800,
        httpOnly: false,
        secure: process.env.COOKIE_SECURE !== false,
        domain: process.env.COOKIE_DOMAIN || '.hehlzx.cn'
    }).json({
        username: req.user.username,
        group: req.user.group
    });
});


/**
 * 登出
 * GET /user/logout
 *
 * @response 200 成功登出
 * {String} message 消息提示
 */

router.get('/logout', function(req, res) {
    req.logout();
    res.status(200).json({
        message: 'Logged out.'
    });
});


/**
 * 修改密码
 * PUT /user/password
 *
 * @param {String} presentPassword  现在的密码
 * @param {String} newPassword      将修改成为的密码
 *
 * @response 201 修改成功
 * {String} message 消息提示
 *
 * @response 400 有点问题
 * {String} error   错误名
 * {String} message 错误提示
 */

router.put('/password', ensureLoggedIn, function(req, res, next) {
    let no = new CheckError(res).check;

    if (!req.body.presentPassword) {
        res.status(400).json({
            error: 'NoPresentPasswordProvided',
            message: '请提供现在的密码'
        });
        return;
    }

    if (!req.body.newPassword) {
        res.status(400).json({
            error: 'NoNewPasswordProvided',
            message: '请提供新的密码'
        });
        return;
    }

    if (req.body.newPassword === req.body.presentPassword) {
        res.status(400).json({
            error: 'SamePasswords',
            message: '新密码不可以与旧密码相同'
        });
        return;
    }

    let _user;

    Step(
        function () {
            // 通过用户名查找用户
            User.findByUsername(req.user.username, this);
        },
        function (err, user) {
            // 验证现在的密码是否正确
            if (no(err)) {
                if (user) {
                    _user = user;
                    _user.authenticate(req.body.presentPassword, this);
                } else {
                    res.status(404).json({
                        name: 'UserNotFound',
                        message: 'The user doesn\'t exist.'
                    });
                }
            }
        },
        function(i, user, err) {
            // 设置新的密码
            if (no(err)) {
                _user.setPassword(req.body.newPassword, this);
            }
        },
        function(err, user) {
            // 保存修改
            if (no(err)) {
                user.save(this);
            }
        },
        function(err) {
            // 回复
            if (no(err)) {
                res.status(201).json({
                    message: 'Modified.'
                });
            }
        }
    );
});


/**
 * 获取用户信息
 * GET /user/:username
 *
 * @param {String}  username    用户名
 *
 * @response 200 获取成功
 * {Object} user    用户信息
 */

router.get('/:username', function(req, res) {
    let no = new CheckError(res).check;

    Step(
        function() {
            UserService.getSingleUser(req.params.username, 'safe', this);
        },
        function(err, user) {
            if (no(err)) {
                res.status(200).json(user);
            }
        }
    );
});


/**
 * 修改用户所属的用户组
 * PUT /user/:username/group
 *
 * @permission 'ChangeUserGroup'
 * @permission (optional) 'ChangeManager'
 *
 * @param {String}  username    用户名
 * @param {String}  group       用户组
 *
 * @response 201 修改成功
 * {String} message 提示信息
 */

router.put('/:username/group', ensureLoggedIn, permittedTo('ChangeUserGroup'), function(req, res, next) {
    // 只有超级管理员可以设他人用户组为超级管理员
    // 只有有「设他人为管理员」的用户组可以社他人用户组为管理员
    if (req.body.group === 'admin' && req.user.group !== 'admin'
        || (req.body.group === 'manager' && !req.user.permission.includes('ChangeManager'))) {
        return res.status(400).json({
            error: 'PermissionDenied',
            message: 'You don\'t have the permission to do this.'
        });
    }

    let no = new CheckError(res).check,
        _user;

    Step(
        function() {
            GroupService.getGroupInfo(req.body.group, this);
        },
        function(err) {
            if (no(err)) {
                User.findByUsername(req.params.username, this);
            }
        },
        function(err, user) {
            if (no(err)) {
                if (user) {
                    _user = user;
                    cache.update(user._id, this);
                } else {
                    res.status(404).json({
                        name: 'UserNotFound',
                        message: 'The user doesn\'t exist.'
                    });
                }
            }
        },
        function(err) {
            if (no(err)) {
                _user.update({
                    $set: {
                        group: req.body.group
                    }
                }, this);
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
 * 修改用户信息（除用户组）
 * PUT /user/:username
 *
 * @permission 'ModifyUserInfo'
 *
 * 以下悉为可选参数
 * @param {String}      username    用户名
 * @param {String}      uid         学号
 */

router.put('/:username', ensureLoggedIn, permittedTo('ModifyUserInfo'), function(req, res) {
    let no = new CheckError(res).check,
        operationField = ['username', 'uid'],
        _user;
    
    if (!(req.body.username || req.body.uid)) {
        return res.status(400).json({
            error: 'MissingParam(s)',
            message: '请求缺少某个/某些参数'
        });
    }
    Step(
        function() {
            User.findByUsername(req.params.username, this);
        },
        function(err, user) {
            if (no(err)) {
                if (user) {
                    _user = user;
                    cache.update(user._id, this);
                } else {res.status(404).json({
                        name: 'UserNotFound',
                        message: 'The user doesn\'t exist.'
                    });
                }
            }
        },
        function(err) {
            if (no(err)) {
                let update = {};
                for (let item of operationField) {
                    update[item] = req.body[item] || _user[item];
                }
                _user.update({ $set: update }, this);
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
 * 获取读书情况
 * GET /user/:username/status
 */

router.get('/:username/status', function(req, res) {
    let no = new CheckError(res).check;

    Step(
        function() {
            UserService.getReadingStatus(req.params.username, this);
        },
        function(err, status) {
            if (no(err)) {
                res.status(200).json({ status });
            }
        }
    );
});

module.exports = router;