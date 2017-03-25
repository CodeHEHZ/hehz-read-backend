let chai = require('chai'),
    chaiHttp = require('chai-http'),
    server = require('../app'),
    should = chai.should(),
    initialize = require('../api/initialize');

describe('Initializing', () => {
    it('Let\'t begin with initialization...', (done) => {
        initialize(() => done());
    });
});

chai.use(chaiHttp);

describe('GET /user/:username', () => {
    it('It should return the username and user group', (done) => {
        chai.request(server)
            .get('/user/admin')
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.have.property('username');
                res.body.should.have.property('group');
                done();
            });
    });

    it('It should return an Not Found error', (done) => {
        chai.request(server)
            .get('/user/gougoushibendan')
            .end((err, res) => {
                res.should.have.status(400);
                res.body.should.have.property('error');
                res.body.should.have.property('message');
                done();
            });
    });
});

describe('GET /user/logout', () => {
    it('It should return a message saying \'Logged out\'', (done) => {
        chai.request(server)
            .get('/user/logout')
            .end((err, res) => {
                res.should.have.status(200);
                res.body.message.should.be.eql('Logged out.');
                done();
            });
    });
});