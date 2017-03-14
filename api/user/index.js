let express = require('express'),
    router = express.Router(),
    Step = require('step'),
    ensureLoggedIn = require('../util/ensureLoggedIn'),
    passport = require('passport'),
    Account = require('../schema').Account;

router.post('/register', function(req, res) {
    Step(
        function() {
            Account.register(new Account({
                username: req.body.username,
                schoolId: req.body.id
            }), req.body.password, this);
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

router.post('/login', passport.authenticate('local'), function(req, res) {
    res.json({
        username: req.user.username
    });
});

router.post('/logout', function(req, res) {
    req.logout();
    res.json({
        message: 'Logged out.'
    });
});

router.put('/password', ensureLoggedIn, function(req, res) {
    if (!req.body.password) {
        return res.status(400).json({
            error: 'NoNewPasswordProvided',
            message: '请提供新的密码'
        });
    }

    Step(
        function () {
            Account.findByUsername(req.user.username, this);
        },function (err, user) {
            if (err) {
                console.log('UnknownIssue', err);
                return res.status(400).json({
                    error: 'UnknownIssue',
                    message: 'Unknown issue happened'
                });
            }

            user.setPassword(req.body.password, this);
        },
        function(err) {
            if (err) {
                return res.status(400).json({
                    error: err.name,
                    message: err.message
                });
            }

            res.status(201).json({
                message: 'Modified.'
            });
        }
    );
});

module.exports = router;