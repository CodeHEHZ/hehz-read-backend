/**
 * @file 首页
 * 没啥用
 */

let express = require('express');
let router = express.Router();

// 雷叔

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index');
});

module.exports = router;
