"use strict";
const express = require('express');
const nodemailer = require('nodemailer');

module.exports = function(api, router, database) {

    var email = express.Router();
    router.use('/email', email);
    
    var options = {pool: true,
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // don't use SSL
        auth: {
            user: 'support@cropolis.co',
            pass: '@OaklandEats'
        }
    };
    var transporter = nodemailer.createTransport(options);

    var utils = api.get('utils');
    // var emailValidator = api.get('validationRetriever')('Email');
    
    email.post('/send', function(req, res, next) {
        
        // setup e-mail data with unicode symbols
        var mailOptions = {
            from: '"Cropolis Development" <operations@cropolis.co>', // sender address
            to: 'ercgrat@gmail.com', // list of receivers
            subject: 'Welcome to Cropolis', // Subject line
            text: 'Hello, world!', // plaintext body
            html: '<h1>Cropolis</h1><br/><div><b>Hello, world!</b></div>' // html body
        };
        
        console.log(mailOptions);
        console.log(transporter);

        // send mail with defined transport object
        transporter.sendMail(mailOptions, function(error, info) {
            if(error){
                return console.log(error);
            }
            console.log('Message sent: ' + info.response);
        });
        
    });
};