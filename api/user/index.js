/**
 * @file 用户接口
 * @author IncredibLink(incrediblelink@gmail.com)
 *
 * 注册：POST /user/register
 * 登录：POST /user/login
 * 登出：GET  /user/logout
 * 更改密码：PUT /user/password
 * 获取读书情况：GET /user/:username/status
 * 获取用户列表：GET /user/list
 * 为用户增加标签：PUT /user/tag
 * 为用户删除标签：DELETE /user/tag
 * 允许／拒绝用户查看特定用标签用户：POST /user/tag
 * 获取用户信息：GET /user/:username
 * 修改用户所属的用户组：PUT /user/:username/group
 * 修改用户信息（除用户组）：PUT /user/:username
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
    captchaValidator = require('../util/captchaValidator.middleware'),
    paramValidator = require('../util/paramValidator.middleware');

let schoolList = process.env.schoolList || ['华二黄中', '华师大二附中'],
    usernameNotAllowed = ['new', 'admin', 'list', 'tag', 'password', 'login', 'logout', 'register'];


router.get('/', ensureLoggedIn, function(req, res) {
    res.status(200).cookie('user', req.user).json(req.user);
});


/**
 * 注册用户
 * POST /user/register
 * @param {String}  username    用户名
 * @param {String}  name        姓名
 * @param {String}  school      学校
 * @param {String}  uid         学号
 * @param {String}  group       用户组，默认为 student
 * @param {String}  password    密码
 *
 * @response 201 注册成功
 * {String} username    用户名
 * {String} group       用户组
 * {Date}   createdTime 创建时间
 */

router.post('/register', paramValidator('username', 'name', 'school', 'uid', 'group', 'password'), function(req, res) {
    let no = new CheckError(res).check,
        _user;

    Step(
        function() {
            if (usernameNotAllowed.includes(req.body.username)) {
                res.status(400).json({
                    error: 'UsernameNotPermitted',
                    message: '不允许该用户名'
                });
            } else {
                User.find({ username: req.body.username }, this);
            }
        },
        function(err, users) {
            if (no(err)) {
                if (users.length !== 0) {
                    res.status(400).json({
                        error: 'RepeatedUsername',
                        message: '已有相同用户名的用户'
                    });
                } else {
                    if (schoolList.includes(req.body.school)) {
                        User.find({ uid: req.body.uid, school: req.body.school }, this);
                    } else {
                        res.status(400).json({
                            error: 'SchoolNotSupported',
                            message: '暂不支持添加该校人员'
                        });
                    }
                }
            }
        },
        function(err, users) {
            if (no(err)) {
                if (users.length !== 0) {
                    res.status(400).json({
                        error: 'RepeatedUid',
                        message: '该校内已有相同学号者注册'
                    })
                } else {
                    let user = {
                        username: req.body.username,
                        name: req.body.name,
                        school: req.body.school,
                        uid: req.body.uid,
                        group: req.body.group,
                    };
                    User.register(new User(user), req.body.password, this);
                }
            }
        },
        function(err, user) {
            if (no(err)) {
                _user = user;
                cache.update('all', this);
            }
        },
        function(err) {
            if (no(err)) {
                res.status(201).json({
                    username: _user.username,
                    name: _user.name,
                    group: _user.group,
                    school: _user.school,
                    createdTime: _user.createdTime
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
 * {String} name        姓名
 * {String} group       用户组
 * 同时给用户发去一个 session，session 存储于 Redis 中。
 */

router.post('/login', captchaValidator, passport.authenticate('local'), function(req, res) {
    console.log({
        _id: req.user._id,
        username: req.user.username,
        group: req.user.group,
        name: req.user.name
    })
    res.status(200).cookie('user', {
        _id: req.user._id,
        username: req.user.username,
        group: req.user.group,
        name: req.user.name
    }, {
        maxAge: 604800,
        httpOnly: false,
        secure: process.env.COOKIE_SECURE !== 'false' || process.env.COOKIE_SECURE !== false,
        domain: process.env.COOKIE_DOMAIN || '.hehlzx.cn'
    }).json({
        username: req.user.username,
        group: req.user.group,
        name: req.user.name
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

router.put('/password', ensureLoggedIn, function(req, res) {
    let no = new CheckError(res).check;

    if (!req.body.presentPassword) {
        return res.status(400).json({
            error: 'NoPresentPasswordProvided',
            message: '请提供现在的密码'
        });
    }

    if (!req.body.newPassword) {
        return res.status(400).json({
            error: 'NoNewPasswordProvided',
            message: '请提供新的密码'
        });
    }

    if (req.body.newPassword === req.body.presentPassword) {
        return res.status(400).json({
            error: 'SamePasswords',
            message: '新密码不可以与旧密码相同'
        });
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
 * 修改他人密码
 * PUT /user/:username/password
 *
 * @param {String} password     将修改成为的密码
 *
 * @response 201 修改成功
 * {String} message 消息提示
 *
 * @response 400 有点问题
 * {String} error   错误名
 * {String} message 错误提示
 */

router.put('/:username/password', ensureLoggedIn, function(req, res) {
    let no = new CheckError(res).check;

    if (!req.body.password) {
        return res.status(400).json({
            error: 'NoNewPasswordProvided',
            message: '请提供新的密码'
        });
    }

    let _user;

    Step(
        function () {
            // 通过用户名查找用户
            User.findByUsername(req.params.username, this);
        },
        function (err, user) {
            // 验证现在的密码是否正确
            if (no(err)) {
                if (user) {
                    _user = user;
                    if (req.user.group === 'admin'
                        || (req.user.group === 'manager' && ['student', 'teacher'].includes(_user.group))) {
                        _user.setPassword(req.body.password, this);
                    } else {
                        res.status(400).json({
                            name: 'PermissionDenied',
                            message: '您没有权限修改他人的密码'
                        });
                    }
                } else {
                    res.status(404).json({
                        name: 'UserNotFound',
                        message: '该用户不存在'
                    });
                }
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
                    message: '修改成功'
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


/**
 * 获取用户列表
 * GET /user/list
 *
 * @response 200 userList
 * {[Object]}   user    用户
 */

router.get('/list', ensureLoggedIn, function(req, res) {
    let no = new CheckError(res).check;

    Step(
        function() {
            UserService.getUserList(req.user.username, this);
        },
        function(err, userList) {
            if (no(err)) {
                res.status(200).json({
                    userList
                });
            }
        }
    );
});


/**
 * 为用户增加标签
 * PUT /user/tag
 *
 * @param {String/[String]} user    被添加标签用户名
 * @param {String}          tag     要添加的标签名
 *
 * @response 201 添加成功
 * {String} message 提示信息
 */

router.put('/tag', paramValidator('user', 'tag'), ensureLoggedIn, function(req, res) {
    let no = new CheckError(res).check;

    Step(
        function() {
            UserService.setTag(req.user.username, req.body.user, req.body.tag, 'add', this);
        },
        function(err) {
            if (no(err)) {
                res.status(201).json({
                    message: '添加成功'
                });
            }
        }
    );
});


/**
 * 为用户删除标签
 * DELETE /user/tag
 *
 * @param {String/[String]} user    被删除标签用户名
 * @param {String}          tag     要删除的标签名
 *
 * @response 201 删除成功
 * {String} message 提示信息
 */

router.delete('/tag', paramValidator('user', 'tag'), ensureLoggedIn, function(req, res) {
    let no = new CheckError(res).check;

    Step(
      function() {
          UserService.setTag(req.user.username, req.body.user, req.body.tag, 'pull', this);
      },
      function(err) {
          if (no(err)) {
              res.status(201).json({
                  message: '删除成功'
              });
          }
      }
    );
});


/**
 * 允许／拒绝用户查看特定用标签用户
 * POST /user/tag
 *
 * @param {String/[String]} user    被添加／删除标签用户名
 * @param {String}          tag     要添加／删除的标签名
 * @param {String}          action  添加／删除（'add' / 'pull'）
 *
 * @response 201 修改成功
 * {String} message 提示信息
 */

router.post('/tag', paramValidator('user', 'tag', 'action'), ensureLoggedIn, function(req, res) {
    let no = new CheckError(res).check;

    Step(
        function() {
            UserService.allowTag(req.user.username, req.body.user, req.body.tag, req.body.action, this);
        },
        function(err) {
            if (no(err)) {
                res.status(201).json({
                    message: '修改成功'
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
    let no = new CheckError(res).check,
        mode = ['teacher', 'manager', 'admin'].includes(req.user.group)
            ? 'original'
            : 'safe';

    Step(
        function() {
            UserService.getSingleUser(req.params.username, mode, this);
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
    // 只有有「设他人为管理员」权限的用户组可以社他人用户组为管理员
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
              console.log(_user)
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
 * @param {String}      name        姓名
 * @param {String}      school      所在学校
 */

router.put('/:username', ensureLoggedIn, permittedTo('ModifyUserInfo'), function(req, res) {
    let no = new CheckError(res).check,
        operationField = ['username', 'uid', 'name', 'school'],
        _user;

    if (!(req.body.username || req.body.uid || req.body.name || req.body.school)) {
        return res.status(400).json({
            error: 'MissingParam(s)',
            message: '请求缺少某个/某些参数'
        });
    }

    if (req.body.school) {
        if (!schoolList.includes(req.body.school)) {
            return res.status(400).json({
                error: 'SchoolNotSupported',
                message: '暂不支持修改为该校'
            });
        }
    }

    if (req.body.username && req.body.username !== req.params.username && usernameNotAllowed.includes(req.body.username)) {
        return res.status(400).json({
            error: 'UsernameNotPermitted',
            message: '不允许该用户名'
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
                } else {
                    res.status(404).json({
                        name: 'UserNotFound',
                        message: '用户不存在'
                    });
                }
            }
        },
        function(err) {
            if (no(err)) {
                if ((req.body.uid && req.body.uid !== _user.uid) || (req.body.school && req.body.school !== _user.school)) {
                    User.find({ uid: req.body.uid || _user.uid, school: req.body.school || _user.school }, this);
                } else if (req.body.username && (req.body.username !== _user.username)) {
                    User.find({ username: req.body.username }, this);
                } else {
                    this();
                }
            }
        },
        function(err, users) {
            if (no(err)) {
                if ((users || []).length !== 0) {
                    res.status(400).json({
                        error: 'RepeatedUidOrUsername',
                        message: '该校内已有相同学号者注册，或已有该用户名已被注册'
                    });
                } else {
                    let update = {};
                    for (let item of operationField) {
                        update[item] = req.body[item] || _user[item];
                    }
                    _user.update({ $set: update }, this);
                }
            }
        },
        function(err) {
            if (no(err)) {
                let group = this.group();
                cache.update(_user._id, group());
                cache.update('all', group());
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

module.exports = router;