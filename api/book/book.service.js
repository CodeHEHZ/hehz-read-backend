/**
 * @file 关于书本的各种服务
 *
 * @function hash(author, name, mode)
 * @function necessaryInfo(book)
 * @function getSingleBook(author, name, mode(, hash), cb)
 */

let _ = require('lodash'),
    Step = require('step'),
    cache = require('../util/cacheSystem'),
    Book = require('../schema').Book,
    md5 = require('object-hash').MD5;

let BookService = {
    /**
     * @function hash
     * 根据模式生成图书的 md5 哈希
     *
     * @param author    作者
     * @param book      书名
     * @param mode      模式('safe'/'original')
     */

    hash(author, book, mode) {
        return mode == 'safe'
            ? md5({ book: [author, book, 'safe'] })
            : md5({ book: [author, book] });
    },


    /**
     * @function necessaryInfo
     * 剔除不需要的、或用户不能看见的信息
     * 仅保留 'name'、'author'、'open'、'category'、'cover'、'_id' 字段
     *
     * @param {Object|[Object]} book 图书信息
     *
     * @return {Object} 剔除好的图书信息
     */

    necessaryInfo(book) {
        let answer = [];
        if (_.isArray(book)) {
            for (let i = 0; i < book.length; i++) {
                answer[i] = _.pick(book[i], ['name', 'author', 'open', 'category', 'cover', '_id']);
            }
        } else {
            answer = _.pick(book, ['name', 'author', 'open', 'category', 'cover', '_id'])
        }
        return answer;
    },


    /**
     * @function getSingleBook
     * 获取一本书的信息
     *
     * @param author    作者
     * @param name      书名
     * @param mode      获取格式，safe 为剔除过信息的，original 为原封不动的
     * @param hash      [作者, 书名] 的 md5 哈希（如没有可直接填回调函数 cb）
     * @param cb        回调函数
     *
     * @callback(err, book)
     * {Error}  err     错误信息，如无错则为 null
     * {Object} book    书本信息
     */

    getSingleBook(author, name, mode, hash, cb) {
        let _this = this,
            _safeBook,
            _book;

        // 分情况哈希
        if (_.isFunction(hash)) {
            cb = hash;
            hash = _this.hash(author, name, mode);
        }

        Step(
            // 先看看缓存中有没有
            function() {
                cache.get(hash, this);
            },
            function(err, book) {
                if (!err) {
                    // 有的话就直接返回
                    if (book) {
                        cb(null, book);
                    } else {
                        this();
                    }
                } else {
                    cb(err);
                }
            },
            // 没有的话就在数据库中找
            function(err) {
                if (!err) {
                    Book.findOne({
                        name,
                        author
                    }, this);
                }
            },
            // 找到了先写入缓存
            function(err, book) {
                if (!err) {
                    if (book) {
                        _book = book;
                        _safeBook = _this.necessaryInfo(_book);
                        let group = this.group();
                        // 这段写得好恶心...
                        if (mode == 'safe') {
                            cache.set(hash, _book._id, _safeBook, group());
                            cache.set(_this.hash(author, name, 'original'), _book._id, book, group());
                        } else {
                            cache.set(hash, _book._id, _book, group());
                            cache.set(_this.hash(author, name, 'safe'), _book._id, _safeBook, group());
                        }
                    } else {
                        cb({
                            name: 'BookNotFound',
                            message: 'The book you look for doesn\'t exist.'
                        });
                    }
                } else {
                    cb(err);
                }
            },
            function(err) {
                cb(err, mode == 'safe'
                    ? _safeBook
                    : _book);
            }
        );
    }
};

module.exports = BookService;