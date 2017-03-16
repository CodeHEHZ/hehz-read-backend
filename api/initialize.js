/**
 * @file 初始化文件
 * 每次启动时在 /bin/www 中被调用运行，将基本信息（超级管理员、各个用户组等）存入数据库
 * 首次运行时生成超级管理员账号，用户名为 admin，密码默认为 hehz@2016
 */

let Step = require('step'),
    User = require('./schema').User,
    Group = require('./schema').Group,
    _ = require('lodash');

let permissionStudent = ['TakeTest'],
    permissionTeacher = _.flattenDeep([permissionStudent, 'CreateBook', 'CreateQuestion', 'OpenQuiz',
        'CloseQuiz', 'ViewStatistics', 'ModifyBookInfo']),
    permissionManager = _.flattenDeep([permissionTeacher, 'ChangeUserGroup', 'ModifyUserInfo']),
    permissionAdmin = _.flattenDeep([permissionManager, 'ChangeManager',
        'ModifyGroupPermission']);

function initialize() {
    Step(
        function() {
            // 查询是否有 admin 用户
            User.findByUsername('admin', this);
        },
        function(err, user) {
            // 设 admin 为超级管理员，默认密码为 hehz@2016，已有账号的密码不受影响。
            if (err) throw err;
            if (user) {
                user.update({
                    $set: {
                        group: 'admin'
                    }
                }, this);
            } else {
                let user = new User({
                    username: 'admin',
                    group: 'admin',
                    schoolId: 1
                });
                User.register(user, 'hehz@2016', this);
            }
        },
        function(err) {
            // 查询是否有 student 用户组
            if (err) throw err;
            Group.findOne({ title: 'student' }, this);
        },
        function(err, group) {
            // 若没有，则创建 student 用户组
            if (err) throw err;
            if (!group) {
                let student = new Group({
                    title: 'student',
                    permission: permissionStudent
                });
                student.save(this);
            } else {
                this();
            }
        },
        function(err) {
            // 同上，查询是否有 teacher 用户组
            if (err) throw err;
            Group.findOne({ title: 'teacher' }, this);
        },
        function(err, group) {
            // 若没有，则创建 teacher 用户组
            if (err) throw err;
            if (!group) {
                let teacher = new Group({
                    title: 'teacher',
                    permission: permissionTeacher
                });
                teacher.save(this);
            } else {
                this();
            }
        },
        function(err) {
            // 同上，查询是否有 manager 用户组
            if (err) throw err;
            Group.findOne({ title: 'manager' }, this);
        },
        function(err, group) {
            // 若没有，则创建 manager 用户组
            if (err) throw err;
            if (!group) {
                let manager = new Group({
                    title: 'manager',
                    permission: permissionManager
                });
                manager.save(this);
            } else {
                this();
            }
        },
        function(err) {
            // 同上，查询是否有 admin 用户组
            if (err) throw err;
            Group.findOne({ title: 'admin' }, this);
        },
        function(err, group) {
            // 若没有，则创建 admin 用户组
            if (err) throw err;
            if (!group) {
                let admin = new Group({
                    title: 'admin',
                    permission: permissionAdmin
                });
                admin.save(this);
            } else {
                this();
            }
        }
    );
}

module.exports = initialize;