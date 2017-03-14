/**
 * @file 用户接口
 * @author IncredibLink(incrediblelink@gmail.com)
 *
 * 注册：POST /register
 * 登录：POST /login
 * 登出：GET  /logout
 * 更改密码：PUT /password
 */

let express = require('express'),
    router = express.Router(),
    Step = require('step'),
    ensureLoggedIn = require('../util/ensureLoggedIn.middleware'),
    passport = require('passport'),
    Account = require('../schema').Account,
    Group = require('../schema').Group,
    CheckError = require('../util/checkError');


/**
 * 注册用户
 * POST /user/register
 * @param {String}  username    用户名
 * @param {String}  schoolId    学号
 * @param {String}  group       用户组，默认为 student
 *
 * @response 201 注册成功
 * {String} username    用户名
 * {String} group       用户组
 * {Date}   createdTime 创建时间
 */

router.post('/register', function(req, res) {
    let no = new CheckError(res);
    
    Step(
        function() {
            let user = {
                username: req.body.username,
                schoolId: req.body.id,
                group: req.body.group
            };
            Account.register(new Account(user), req.body.password, this);
        },
        function(err, account) {
            if (no(err)) {
                res.status(201).json({
                    username: account.username,
                    group: account.group,
                    createdTime: account.createdTime
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

router.post('/login', passport.authenticate('local'), function(req, res) {
    res.status(200).json({
        username: req.user.username
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

    let _account;

    Step(
        function () {
            // 通过用户名查找用户
            Account.findByUsername(req.user.username, this);
        },
        function (err, account) {
            // 验证现在的密码是否正确
            if (no(err)) {
                _account = account;
                _account.authenticate(req.body.presentPassword, this);
            }
        },
        function(i, account, err) {
            // 设置新的密码
            if (no(err)) {
                _account.setPassword(req.body.newPassword, this);
            }
        },
        function(err, account) {
            // 保存修改
            if (no(err)) {
                account.save(this);
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



module.exports = router;