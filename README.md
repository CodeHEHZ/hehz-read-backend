**读书 @ 华二黄中 - 后端** [![Build Status](https://travis-ci.org/CodeHEHZ/hehz-read-backend.svg?branch=master)](https://travis-ci.org/CodeHEHZ/hehz-read-backend)

**环境**
- Node.js > 6.0
- MongoDB
- Redis

** 环境变量 **
- COOKIE_SECURE || true
- COOKIE_DOMAIN || '.hehlzx.cn'
- SESSION_SECRET || 'read@hehz2016'
- RESID_HOST || '127.0.0.1'
- CORS_WHITELIST || ['https://hehlzx.cn']
- MONGO_USERNAME || 'readAdmin'
- MONGO_PWD
- MONGO_AUTH || false
- MONGO_PORT || 27017
- MONGO_HOST || '127.0.0.1'
- MONGO_DATABASE || 'hehz-read'
- MONGO_REPLICA || true
- GEETEST_ID
- GEETEST_KEY
- UPYUN_BUCKET
- UPYUN_OPERATOR
- UPYUN_PWD

**运行**

1. `$ npm i`

2. `$ npm i gulp -g`

3. `$ gulp watch`

4. 访问 `http://localhost:3000` 。