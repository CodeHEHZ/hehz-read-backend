let Geetest = require('geetest');

let captcha;

if (process.env.GEETEST_ID && process.env.GEETEST_KEY) {
    new Geetest({
        geetest_id: process.env.GEETEST_ID,
        geetest_key: process.env.GEETEST_KEY
    });
}

module.exports = captcha;