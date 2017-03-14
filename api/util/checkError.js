/**
 * @file 错误检测器
 * 当有错误时便会进行回答
 *
 * @param res
 * @constructor
 */

function CheckError(res) {
    this.check = (err, errorName, errorMessage) => {
        if (err) {
            res.status(400).json({
                error: errorName || err.name,
                message: errMessage || err.message
            });
            return 0;
        } else {
            return 1;
        }
    };
};

module.exports = CheckError;