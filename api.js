"use strict";
const express = require('express');
const cors = require('cors')
const http = require('http');
const https = require('https');
const bodyParser = require('body-parser');
const passport = require('passport');
const googleMapsClient = require('@google/maps').createClient({
    key: 'AIzaSyCDIU9SLMMHJApsZEGRd7F4VeeHgxtK4ss'
});
const fileSystem = require('fs');

// Parse parameters
var port = 8000;
var verbose = false;
if (process.argv.length > 2) {
    for (var i = 2; i < process.argv.length; i++) {
        if (process.argv[i] === "-verbose") {
            verbose = true;
        } else {
            port = process.argv[i];
        }
    }
}

const router = express.Router();
const database = require('./database.js')(verbose);
const api = express();

// Configure API
api.use(bodyParser.urlencoded({
    extended: true
}));
api.use(bodyParser.json());
api.use(passport.initialize());
api.set('utils', require('./utils.js')(api));
api.set('amazon', require('./amazon.js')(api));
api.set('validationRetriever', function(validator) {
    return require('./validators/' + validator + '.js')(api.get('utils'));
});

api.all('*', function(req, res, next) {
    if(!req.secure) {
        return res.redirect('https://' + req.headers.host + req.url);
    } else {
        next();
    }
});

// Allow Cross-Origin Requests from anywhere in the App ecosystem
// Should filter out requests to make sure they are only coming from our App
// Testing using NPM cors package to handle Cross-Origin Requests and Preflights
var corsOptions = {
    origin: ['https://104.236.222.199', 'https://app.freshearth.io'],
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
router.options('*', cors(corsOptions));
router.use(cors());

// Set base URL for all routes
api.use('/api', router);

// ***Place all routes here - order matters***
require('./routes/validation.js')(api, router, database);
require('./routes/googleMaps.js')(api, router, database);
require('./routes/auth.js')(api, router, database, passport);
require('./routes/product.js')(api, router, database);
require('./routes/contact.js')(api, router, database);
require('./routes/broadcast.js')(api, router, database);
require('./routes/message.js')(api, router, database);
require('./routes/order.js')(api, router, database);

// Catches all routes that fell through - they are not defined
router.all('*', function(req, res, next) {
    var error = new Error('Resource not found.');
    error.status = 404;
    return next(error);
});

// Error-handling fall-through method
api.use(function(err, req, res, next){
    if (res.headersSent) {
        return next(err);
    }
	
	console.error(err);
	res.status(err.status).json(err);
});

// Specify SSL cert filepath
var options = {
    hostname: 'app.freshearth.io',
    port: 8000,
    path: '/api',
    method: 'GET',
    key: fileSystem.readFileSync('/etc/letsencrypt/live/app.freshearth.io/privkey.pem'),
    cert: fileSystem.readFileSync('/etc/letsencrypt/live/app.freshearth.io/cert.pem'),
    secureProtocol: 'TLSv1_2_server_method'
};

https.createServer(options, api).listen(8000, function(){
    console.log("Listening on port 8000.");
});