/**
 * @file 错误检测器
 * 当有错误时进行回答
 *
 * @param {Object} res  服务器响应
 *
 * @example
 * let CheckError = require('../util/checkError')
 *
 * router.get('/', function(req, res, next) {
 *     let no = new CheckError(res).check;
 *
 *     Step(
 *         function() {
 *             Account.find({}, this);
 *         },
 *         function(err, accounts) {
 *             if (no(err)) {
 *                 Do something...
 *             }
 *         }
 *     );
 * }
 *
 * @constructor
 */

function CheckError(res) {
    this.check = (err, errorName, errorMessage) => {
        if (err) {
            res.status(400).json({
                error: errorName || err.name,
                message: errorMessage || err.message
            });
            return 0;
        } else {
            return 1;
        }
    };
};

module.exports = CheckError;