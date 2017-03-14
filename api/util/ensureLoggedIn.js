/**
 * @file 确认用户是否已经登录，是一个中间件
 *
 * @param {Object}   req  用户请求
 * @param {Object}   res  服务器响应
 * @param {Function} next 跳至下一路由环节
 */

function ensureLoggedIn(req, res, next) {
    if (req.user)
        next();
    else
        res.json({
            error: 'NotLoggedIn',
            message: '您还未登录。'
        });
}

module.exports = ensureLoggedIn;