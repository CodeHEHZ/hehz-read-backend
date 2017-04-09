let Step = require('step'),
    CheckError = require('./checkError'),
    captcha = require('../const/captcha');

function captchaValidator(req, res, next) {
    let no = new CheckError(res).check;

    Step(
        function() {
            if (req.body.captchaChallenge && req.body.captchaValidate && req.body.captchaSecCode)
                this();
            else {
                res.status(400).json({
                    error: 'FailingCaptchaValidation.',
                    message: 'You didn\'t pass the captcha step'
                });
            }
        },
        function() {
            captcha.validate({
                challenge: req.body.captchaChallenge,
                validate: req.body.captchaValidate,
                seccode: req.body.captchaSecCode
            }, this);
        },
        function(err, success) {
            if (no(err)) {
                if (success) {
                    next();
                } else {
                    res.status(400).json({
                        error: 'FailingCaptchaValidation.',
                        message: 'You didn\'t pass the captcha step'
                    });
                }
            }
        }
    );
}

module.exports = captchaValidator;