'use strict';
const express = require('express');
const emailValidator = require('email-validator');

module.exports = function(api, router, database) {

    /*
     *  Setup express.Router() to user /validation
     */
    var validation = express.Router();
    router.use('/validation', validation);
    var userValidator = api.get('validationRetriever')('User');
    var utils = api.get('utils');

    /*
     *  Validation for email addresses
     *
     *    Checks if the email passes Email Validator Middleware Check
     */
    validation.route('/auth/email')
        .get(function(req, res) {
            res.send('GET request to /validation/auth/email');
        })
        .post(function(req, res) {
            emailValidator.validate(req.body.v) ? res.status(200).send(true) : res.status(200).send(false);
        });


    /*
     *  Validation for email addresses
     *
     *    Checks if the email is in the database already
     */
    validation.route('/auth/existingEmail')
        .get(function(req, res) {
            res.send('GET request to /validation/auth/existingEmail');
        })
        .post(function(req, res) {
            database.select('*')
                .from('User')
                .where('email', req.body.v)
                .then(function(rows) {
                    res.status(200).send(rows.length !== 1);
                }).catch(function(error) {
                    return next(utils.generateResponseObject(error));
                });
        });

    /*
     *  Validation for password
     *
     *    Checks if the password matches security requirements
     */
    validation.route('/auth/password')
        .get(function(req, res) {
            res.send('GET request to /validation/auth/password')
        })
        .post(function(req, res) {
            userValidator.passwordRegex.test(req.body.v) ? res.status(200).send(true) : res.status(200).send(false);
        });

    /*
     *  Validation for Repeat Password
     *
     *    Checks if the passwords match
     */
    validation.route('/auth/repeatPassword')
        .get(function(req, res) {
            res.send('GET request to /validation/auth/repeatPassword')
        })
        .post(function(req, res) {
            res.status(200).send(req.body.v.password === req.body.v.repeatPassword);
        });


    /*
     *  Validation for Business Name
     *
     *    Checks if the Business Name has already been registered
     */
    validation.route('/auth/businessName')
        .get(function(req, res) {
            res.send('GET request to /validation/auth/businessName')
        })
        .post(function(req, res) {
            database.select('*')
                .from('Business')
                .where('name', req.body.v)
                .then(function(rows) {
                    res.status(200).send(rows.length !== 1);
                }).catch(function(error) {
                    return next(utils.generateResponseObject(error));
                });
        });
}
