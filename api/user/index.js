let express = require('express'),
    router = express.Router(),
    Step = require('step'),
    passport = require('passport'),
    Account = require('../schemas').Account;

router.post('/register', function(req, res, next) {
    Step(
        function() {
            Account.register(new Account({ username: req.body.username }), req.body.password, this);
        },
        function(err, account) {
            if (err) {
                res.json({
                    error: err.name,
                    message: err.message
                });
            } else {
                res.json(account);
            }
        }
    );
});

router.post('/login', passport.authenticate('local'), function(req, res, next) {
    res.json(req.user);
});

module.exports = router;