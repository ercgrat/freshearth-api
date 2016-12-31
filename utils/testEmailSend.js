'use strict';
const request = require('request');
var token = null;
request.post({
    url: 'http://45.55.250.153:8001/api/auth/login',
    form: {
        email: 'ercgrat@gmail.com',
        password: 'L3ttuceMakeCa$h'
    }
},function(err, httpResponse, body) {
    var token = JSON.parse(body).token;
    request.post({
        url: 'http://45.55.250.153:8001/api/email/send',
        headers: {
            'Authorization': token
        },
        form: {
            v: 1
        }
    }, function(err, httpResponse, body) {
        console.log(body);
        process.exit();
    });
});