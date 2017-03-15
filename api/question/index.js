let express = require('express'),
    router = new express.Router(),
    Step = require('step'),
    CheckError = require('../util/checkError'),
    cache = require('../util/cacheSystem'),
    QuestionService = require('./question.service');

module.get('/:id', function(req, res, next) {
    let no = new CheckError(res).check;

    Step(
        function() {
            QuestionService.getSingleQuestion(req.params.id, this);
        },
        function(err, question) {
            if (no(err)) {
                res.status(200).json(question);
            }
        }
    );
});

module.exports = router;