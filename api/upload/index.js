let express = require('express'),
    router = express.Router(),
    multipart = require('connect-multiparty'),
    multipartMiddleware = multipart(),
    CheckError = require('../util/checkError'),
    UpYun = require('upyun'),
    fs = require('fs'),
    path = require('path'),
    sha256 = require('js-sha256'),
    Step = require('step'),
    File = require('../schema').File;

let bucket = process.env.UPYUN_BUCKET,
    operator = process.env.UPYUN_OPERATOR,
    password = process.env.UPYUN_PWD;

let upyun = new UpYun(bucket, operator, password, 'v0.api.upyun.com', {
    apiVersion: 'v2'
});

router.post('/', multipartMiddleware, function(req, res) {
    let no = new CheckError(res).check,
        file = req.files.file,
        _data, _file, _hash, _key;

    Step(
        function() {
            fs.readFile(file.path, this);
        },
        function(err, data) {
            if (no(err)) {
                _data = data;
                _hash = sha256(_data);
                File.findOne({ hash: _hash }, this);
            }
        },
        function(err, result) {
            if (no(err)) {
                if (result)
                    res.status(200).json({
                        key: result.key
                    });
                else {
                    _file = new File({
                        originalFilenameName: file.originalFilename,
                        hash: _hash
                    });
                    _file.save(this);
                }
            }
        },
        function(err, result) {
            if (no(err)) {
                _key = result._id + path.extname(file.originalFilename);
                upyun.putFile(_key, _data, null, true, null, this);
            }
        },
        function(err) {
            if (no(err)) {
                _file.key = _key;
                _file.save(this);
            }
        },
        function(err) {
            if (no(err)) {
                res.status(201).json({
                    key: _key
                });
            }
        }
    );
});

module.exports = router;