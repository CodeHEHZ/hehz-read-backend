/**
 * @file 用于检验用户请求的参数的中间件
 * 若请求的所有参数都符合要求，则可顺利进入下一路由环节。
 *
 * @param {[String/[String, String]]}    params  应有的参数/[应有的参数/预期的类型]
 *                                      （不限参数数量）
 *
 * @example
 * let paramValidator = require('../util/paramValidator');
 * router.get('/', paramValidator('name', ['category', 'object']), function(req, res, this) {
 *     // Do something...
 *     // 当 req.body 中有 name 及 category 字段，且 req.body.category 的类型为 object，则可通过验证
 * }
 *
 * @note
 * 这里的实现感觉挺丑的，求拯救
 */

function paramValidator(...params) {
    return function(req, res, next) {
        for (let param of params) {
            if (typeof(param) == 'object' && param.length == 2) {
                if (req.body[param[0]]) {
                    if (!(typeof(req.body[param[0]]) == param[1])) {
                        return res.status(400).json({
                            error: 'WrongParamFormat',
                            message: '错误的参数格式'
                        });
                    }
                } else {
                    return res.status(400).json({
                        error: 'MissingParam(s)',
                        message: '请求缺少某个/某些参数'
                    });
                }
            } else if (!req.body[param]) {
                return res.status(400).json({
                    error: 'MissingParam(s)',
                    message: '请求缺少某个/某些参数'
                });
            }
        }
        next();
    }
}

module.exports = paramValidator;