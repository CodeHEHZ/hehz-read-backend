let express = require('express');
let router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	req.body.love
    res.render('index');
});

module.exports = router;
