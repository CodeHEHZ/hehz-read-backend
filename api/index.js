/**
 * @file 首页
 * 没啥用
 */

let express = require('express');
let router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index');
});

module.exports = router;
