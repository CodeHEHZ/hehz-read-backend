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
    permission = require('../util/permission.middleware'),
    CheckError = require('../util/checkError'),
    Group = require('../schema').Group;

router.get('/:title', ensureLoggedIn, permission, function(req, res) {
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

module.exports = router;