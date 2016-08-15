'use strict';
var express = require('express'), 
    db = require('../models'),
    logger = require('../helpers/logger'),
    router = express.Router(),
    moment = require('moment'),
    config = require('config'),
    cache = require('../helpers/cache'),
    crypto = require('crypto');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var q = require('../queues');

// create a new user
router.post('/create', function(req, res){
    var user = new db.User(req.body);
    user.save(function(error, new_user){
        if (error) {
            return res.status(406).send(JSON.stringify({error}));
        }

        // send email job to Queue Message System
        logger.debug('Send a message to Queue', new_user.email);
        q.create('email', {
            title: '[Site Admin] Thank You',
            to: new_user.email
        }).priority('high').save();

        delete new_user['salt'];
        delete new_user['password'];
        delete new_user['hashed_password'];
        res.send(JSON.stringify(new_user));
    });
});

//update a user
router.put('/update/:id', function(req, res) {
    db.User.findByIdAndUpdate(req.params.id, req.body, function(err, post) {
        if (err) return next(err);
        cache.del('get_user_by_id' + req.params.id);
        res.json(post);
    });
});

// get a user by id
router.get('/get/:id', function(req, res){
    logger.debug('Get User By Id', req.params.id);

    cache.get('get_user_by_id' + req.params.id, function (err, reply) {
        if (!err && reply) {
            logger.debug('Get Data from cache');
            return res.send(reply);
        } else {
            db.User.findOne({
                _id: req.params.id
            }).then(function(user){
                // remove security attributes
                user = user.toObject();
                if (user) {
                    delete user.hashed_password;
                    delete user.salt;
                }
                // save to cache
                logger.debug('Save data to cache', req.params.id);
                cache.set('get_user_by_id' + req.params.id, JSON.stringify(user));

                res.send(JSON.stringify(user));
            }).catch(function(e){
                res.status(500).send(JSON.stringify(e));
            });
        }
    });


});

// get list of users
router.get('/list/:page/:limit', function(req, res){
    logger.debug('Get List User', req.params.limit, req.params.page);
    var limit = (req.params.limit)? req.params.limit: 10;
    var skip = (req.params.page)? limit * (req.params.page - 1): 0;
    db.User
    .find()
    .skip(skip)
    .limit(limit)
    .sort({'_id': 'desc'})
    .then(function(users) {
        res.send(JSON.stringify(users));
    }).catch(function(e) {
        res.status(500).send(JSON.stringify(e));
    });
});

// login
router.post('/login', function(req, res){
    var username = req.body.username;
    var password = req.body.password;
    db.User.findOne({
        username: username
    }).then(function(user){
        if (!user.authenticate(password)) {
            throw false;
        }
        db.Token.findOne({
            username: username
        }).then(function(t){
            if (!t){
                crypto.randomBytes(64, function(ex, buf) {
                    var token = buf.toString('base64');
                    var today = moment.utc();
                    var tomorrow = moment(today).add(config.get('token_expire'), 'seconds').format(config.get('time_format'));
                    var token = new db.Token({
                        username: username,
                        token: token,
                        expired_at: tomorrow.toString()
                    });
                    token.save(function(error, to){
                        return res.send(JSON.stringify(to));
                    });
                });
            }
            res.send(JSON.stringify({
                token: t.token,
                id: user.id,
                expired_at: t.expired_at
            }));
        });
    }).catch(function(e){
        res.status(401).send(JSON.stringify(e));
    });
});

module.exports = router;
