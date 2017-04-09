let express = require('express'),
    router = express.Router(),
    Step = require('step'),
    CheckError = require('../util/checkError'),
    captcha = require('../const/captcha');

router.get('/', function(req, res) {
    let no = new CheckError(res).check;

    Step(
        function() {
            captcha.register(this);
        },
        function(err, data) {
            if (no(err)) {
                res.status(200).json({
                    gt: data.gt,
                    challenge: data.challenge,
                    success: data.success
                });
            }
        }
    );
});

module.exports = router;