/**
 * @file 关于用户组的各种服务
 */

let cache = require('../util/cacheSystem'),
    Group = require('../schema').Group,
    Step = require('step');

let md5 = {
    student: '47b21f0fb7c804e21a09703fa674e985',
    teacher: 'bb744efbbd521cef4acd685d35e84c9b',
    manager: '015b795e0672f0a8b0de96fc52a572eb',
    admin: 'd990337c69e8f2fc30e81c8c43beb9c8'
};

let GroupService = {
    getGroupInfo(title, cb) {
        let _group;

        Step(
            function() {
                if (!md5[title]) {
                    cb({
                        error: 'UserGroupNotFound',
                        message: '没找到你所在的用户组'
                    });
                } else {
                    cache.get(md5[title], this);
                }
            },
            function(err, group) {
                if (err) {
                    cb(err);
                } else {
                    if (group) {
                        cb(null, group);
                    } else {
                        Group.findOne({ title }, this);
                    }
                }
            },
            function(err, group) {
                if (err) {
                    cb(err);
                } else {
                    if (group) {
                        _group = group;
                        cache.set(md5[title], group._id, group, this);
                    } else {
                        cb({
                            error: 'UserGroupNotFound',
                            message: '没找到用户组'
                        });
                    }
                }
            },
            function(err) {
                cb(err, _group);
            }
        );
    }
};

module.exports = GroupService;