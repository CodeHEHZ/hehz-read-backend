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
    ensureLoggedIn = require('../util/ensureLoggedIn'),
    passport = require('passport'),
    Account = require('../schema').Account,
    CheckError = require('../util/checkError');


/**
 * 注册用户
 * POST /user/register
 * @param {String}  username    用户名
 * @param {String}  schoolId    学号
 * @param {String}  group       用户组，默认为 student
 */

router.post('/register', function(req, res) {
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
            if (err) {
                res.status(400).json({
                    error: err.name,
                    message: err.message
                });
            } else {
                res.status(200).json({
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
 */

router.post('/login', passport.authenticate('local'), function(req, res) {
    res.json({
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
 * @response 400 有点问题
 * {String} error   错误名
 * {String} message 错误提示
 *
 * @response 201 修改成功
 * {String} message 消息提示
 */

router.put('/password', ensureLoggedIn, function(req, res, next) {
    let has = new CheckError(res).check;

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
            Account.findByUsername(req.user.username, this);
        },function (err, account) {
            if (has(err)) {
                _account = account;
                _account.authenticate(req.body.presentPassword, this);
            }
        },
        function(i, account, err) {
            if (has(err)) {
                _account.setPassword(req.body.newPassword, this);
            }
        },
        function(err, account) {
            if (has(err)) {
                account.save(this);
            }
        },
        function(err) {
            if (has(err)) {
                res.status(201).json({
                    message: 'Modified.'
                });
            }
        }
    );
});

module.exports = router;