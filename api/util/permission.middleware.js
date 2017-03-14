/**
 * @file 查询用户权限的中间件
 * 查询结果以数组形式赋给 req.user.permission。
 *
 * @param {Object}   req  用户请求
 * @param {Object}   res  服务器响应
 * @param {Function} next 跳至下一路由环节
 *
 * @property {[String]} req.user.permission 用户权限的数组
 */

let Group = require('../schema').Group,
    CheckError = require('./checkError'),
    Step = require('step');

function permission(req, res, next) {
    let no = new CheckError(res);

    if (req.user && req.user.group) {
        Step(
            function() {
                Group.findOne({ title: req.user.group }, this);
            },
            function(err, group) {
                if (no(err)) {
                    req.user.permission = group.permission;
                }
            }
        )
    }

    next();
}

module.exports = permission;