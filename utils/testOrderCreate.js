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
        url: 'http://45.55.250.153:8001/api/order/create',
        headers: {
            'Authorization': token
        },
        form: {
            v: {
                orders: [
                    {
                        product: '1',
                        quantity: 10
                    },
                    {
                        product: 1,
                        quantity: 5
                    },
                    {
                        product: 2,
                        quantity: 6
                    }
                ]
            }
        }
    }, function(err, httpResponse, body) {
        console.log(body);
        process.exit();
    });
});