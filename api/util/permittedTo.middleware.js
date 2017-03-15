/**
 * @file 查询用户是否具有某种权限的中间件
 * 若用户具有是项权限，则可顺利进入下一路由环节，
 * 同时将用户所有权限以数组形式赋给 req.user.permission。
 *
 * @param {String} permission 权限名
 *
 * @property {[String]} req.user.permission 存储用户权限的数组
 */

let GroupService = require('../group/group.service'),
    CheckError = require('./checkError'),
    Step = require('step');

function permittedTo(permission) {
    return function looking(req, res, next) {
        let no = new CheckError(res).check;

        if (req.user && req.user.group) {
            Step(
                function() {
                    GroupService.getGroupInfo(req.user.group, this);
                },
                function(err, group) {
                    if (no(err) && group.permission.includes(permission)) {
                        req.user.permission = group.permission;
                        next();
                    } else {
                        reject(res, permission);
                    }
                }
            );
        } else {
            reject(res, permission);
        }
    }
}

function reject(res, permission) {
    res.status(400).json({
        error: 'PermissionDenied',
        message: 'You don\'t have the permission of ' + permission
    });
}

module.exports = permittedTo;