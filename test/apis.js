var request = require('supertest');
var app = require('../index.js');

describe('GET /', function() {
    it('should return 200 OK', function(done) {
        request(app)
            .get('/')
            .expect(200, done);
    });
});
describe('POST /api/v1/login', function() {
    it('should return 200 OK', function(done) {
        request(app)
            .post('/api/v1/login')
            .field('username', 'test')
            .field('password', 'test')
            .expect(200, done)
            .end(function(err, res) {
                request(app)
                    .put('/api/v1/users/update/5766a4a21359a17e0db66d4e')
                    .set({"Authorization":"Bearer 8lwNvPaOv/omouxiok2hWmsroSGvAlH+WSNS3Jk3eqzR3Em8e8TqIPR7Dk1/rKw9WVVHZJe0e/aOLH2Auh+0Tg=="})
                    .field('username', 'testupdate2')
                    .field('password', 'test')
                    .field('email', 'test@test.com')
                    .expect(200, done);
            });
    });
});
