let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../app');
let should = chai.should();

require('../api/initialize')();

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