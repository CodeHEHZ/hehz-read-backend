let express = require('express');
let router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: '读书 @ 华二黄中 - 后端' });
});

module.exports = router;
