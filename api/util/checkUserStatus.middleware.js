function checkUserStatus(req, res, next) {
    console.log(req.user);
    if ((req.user && req.user.status === 'ok') || !req.user) {
        next();
    } else {
        res.status(400).json({
            error: 'UserBanned',
            message: '您的账号已被禁用，无法进行任何操作，请联系管理猿解封'
        });
    }
}

module.exports = checkUserStatus;