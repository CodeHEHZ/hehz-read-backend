let express = require('express'),
    router = express.Router(),
    Step = require('step'),
    passport = require('passport'),
    Account = require('../schemas').Account;

router.post('/register', passport.initialize(), function(req, res, next) {
    Step(
        function() {
            Account.register(new Account({ username: req.body.username }), req.body.password, this);
        },
        function(err, account) {
            if (err) {
                res.send('www');
            } else {
                passport.authenticate('local')(req, res, this);
            }
        },
        function(err, account) {
            res.send([err, account])
        }
    );
});

module.exports = router;