/**
 * @file 用户组接口
 * @author IncredibLink(incrediblelink@gmail.com)
 *
 * 获取用户组信息：GET /group/:title
 */

let express = require('express'),
    router = express.Router(),
    Step = require('step'),
    ensureLoggedIn = require('../util/ensureLoggedIn.middleware'),
    permittedTo = require('../util/permittedTo.middleware.js'),
    CheckError = require('../util/checkError'),
    Group = require('../schema').Group;


/**
 * 获取用户组信息
 * GET /group/:title
 *
 * @param {String} title    用户组名
 *
 * @response 200 获取成功
 * {String}     title       用户组名
 * {[String]}   permission  权限
 */

router.get('/:title', function(req, res) {
    let no = new CheckError(res).check;

    Step(
        function() {
            Group.findOne({ title: req.params.title }, this);
        },
        function(err, group) {
            if (no(err)) {
                res.status(200).json({
                    title: group.title,
                    permission: group.permission
                });
            }
        }
    );
});

/**
 * 添加/删除用户组权限
 * PUT /group/:title
 *
 * @permission 'ModifyGroupPermission'
 *
 * @param {String}          title       用户组名
 * @param {String}          action      操作（add/delete）
 * @param {String/[String]} permission  权限名
 *
 * @response 201 修改成功
 * {String}     title       用户组名
 * {[String]}   permission  权限
 */

router.put('/:title', ensureLoggedIn, permittedTo('ModifyGroupPermission'), function(req, res) {
    let no = new CheckError(res).check;

    if (!(req.body.action == 'delete' || req.body.action == 'add')) {
        return res.status(400).json({
            error: 'PropertyNotProvided',
            message: 'You didn\'t provide the "action" param properly.'
        });
    }

    if (!req.body.permission) {
        return res.status(400).json({
            error: 'PropertyNotProvided',
            message: 'You didn\'t provide the "permission" param.'
        });
    }

    Step(
        function() {
            if (req.body.action == 'delete') {
                Group.update({ title: req.params.title }, {
                    $pull: { permission: req.body.permission }
                }, this);
            } else if (req.body.action == 'add') {
                Group.update({ title: req.params.title }, {
                    $addToSet: { permission: req.body.permission }
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

module.exports = router;