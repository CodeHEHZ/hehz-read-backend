module.exports = function(req, res, next) {
    if (req.user)
        next();
    else
        res.json({
            error: 'NotLoggedIn',
            message: '您还未登录。'
        });
};