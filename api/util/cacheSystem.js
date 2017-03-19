/**
 * @file 缓存系统
 * 灰常重要的一个东西，帮数据库排忧解难
 *
 * 缓存系统采用 Redis，没有做集群
 * Redis 入门：http://www.runoob.com/redis/redis-tutorial.html
 * 若只是想了解本缓存系统，只需阅读「Redis 字符串」及之前部分与「Redis 集合」部分
 *
 * 各类 Object 的 hash 方法：
 * - 图书：md5({ book: [author, name] })
 * - 经剔除部分信息的图书：md5({ book: [author, name, 'safe'] })
 * - 多本图书：md5({ book: [[author, name]] })
 * - 多本经剔除部分信息的图书：md5({ book: [[author, name], 'safe'] })
 * - 用户：md5({ account: username })
 * - 经剔除敏感信息的用户信息：md5({ account: [username, 'safe'] })
 * - 题目：md5({ question: id })
 * - 不含答案的题目：md5({ question: [id, 'safe'] })
 * - 测试：md5({ quiz: id })
 * - 不含答案的测试：md5({ quiz: [id, 'safe'] })
 * - 用户组：md5({ group: title })
 *
 * 缓存的使用方式：
 * - 获取 get
 * - 写入 set
 * - 更新 update
 */

let Redis = require('ioredis'),
    redis = new Redis(),
    Step = require('step'),
    _ = require('lodash');

let cacheSystem = {


    /**
     * @function get
     * 获取已有缓存
     *
     * @param {String|Object}   hash  要查询的哈希
     * @param {Function}        cb    回调函数
     *
     * @callback(err, result)
     * {Error}  err     错误信息，如无错则为 null
     * {Object} book    查得的信息，如未查到则为 null
     */

    get(hash, cb = () => {}) {
        Step(
            function() {
                redis.get('cache:' + hash, this);
            },
            function(err, result) {
                cb(err, result ? JSON.parse(result) : null);
            }
        );
    },


    /**
     * @function set
     * 写入新的缓存
     *
     * @param {String|Object}   hash    哈希值
     * @param {String|[String]} idSet   所有与这个缓存有关的对象的 MongoDB _id
     * @param {*}               content 要写入的内容
     * @param {Function}        cb      回调函数
     *
     * @callback(err)
     * {Error}  err     错误信息，如无错则为 null
     *
     * @example
     * 批量查询书本信息，则：
     * hash 为 books{[author, name]} 的哈希
     * idSet 为存有 books 中所有书本的 _id 的数组
     * content 为 这些书的信息
     * cb 可以为 function(err, result) {
     *     if (no(err)) {
     *         res.status(200).json(result);
     *     }
     * }
     */

    set(hash, idSet, content, cb = () => {}) {
        Step(
            function() {
                if (!idSet.length) {
                    idSet = [idSet];
                }
                let group = this.group();
                for (let id of idSet) {
                    redis.sadd('object:' + id, hash, group());
                }
            },
            function(err) {
                if (err) cb(err);
                redis.set('cache:' + hash, JSON.stringify(content), cb);
            }
        )
    },


    /**
     * @function update
     * 删除关联数据有改动的缓存
     *
     * @param {String}      id  导致数据改动的对象的 MongoDB _id
     * @param {Function}    cb  回调函数
     *
     * @callback(err)
     * {Error}  err     错误信息，如无错则为 null
     *
     * @example
     * Redis 中有批量查询 a、b、c 三本书所得的缓存 d，则当 a、b、c 中任意一本书
     * 信息被修改后，都应通过 update(id, callback) 来删除原有的缓存 d。
     */

    update(id, cb = () => {}) {
        Step(
            function() {
                redis.smembers('object:' + id, this);
            },
            function(err, results) {
                if (err) cb(err);
                let group = this.group();
                for (let result of results) {
                    Step(
                        function() {
                            redis.del('cache:' + result, this);
                        },
                        function(err) {
                            if (err) cb(err);
                            redis.srem('object:' + id, result, group());
                        }
                    )
                }
            },
            function(err) {
                cb(err);
            }
        );
    }
};

module.exports = cacheSystem;