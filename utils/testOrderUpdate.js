'use strict';
const request = require('request');
var token = null;
request.post({
    url: 'http://45.55.250.153:8001/api/auth/login',
    form: {
        email: 'ercgrat@gmail.com',
        password: 'L3ttuceMakeCa$h'
    }
}, function(err, httpResponse, body) {
    var token = JSON.parse(body).token;
    request.post({
        url: 'http://45.55.250.153:8001/api/order/update',
        headers: {
            'Authorization': token
        },
        form: {
            v: {
                order: 5,
                eventType: "ApproveChangeRequest",
                quantity: 999,
                price: 9.40
            }
        }
    }, function(err, httpResponse, body) {
        console.log(body);
        process.exit();
    });
});