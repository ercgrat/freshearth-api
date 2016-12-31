'use strict';
const request = require('request');
var token = null;
request.post({
    url: 'http://45.55.250.153:8001/api/auth/login',
    form: {
        email: 'operations@cropolis.co',
        password: 'L3ttuceMakeCa$h'
    }
}, function(err, httpResponse, body) {
    token = JSON.parse(body).token;
    request.post({
        url: 'http://45.55.250.153:8001/api/product/create',
        headers: {
            'Authorization': token
        },
        form: {
            name: "Apple",
            available: true,
            quantityAvailable: 10,
            price: 1.14,
            description: "Simply delicious!",
            unit: "lbs",
            allowFloatValues: false,
            infinite: false
        }
    }, function(err, httpResponse, body) {
        console.log(body);
        request.post({
            url: 'http://45.55.250.153:8001/api/product/update',
            headers: {
                'Authorization': token
            },
            form: {
                id: JSON.parse(body).id,
                name: "Blueberries",
                available: false,
                quantityAvailable: 14,
                price: 12.50,
                description: "Simply nutritious!",
                unit: "boxes",
                allowFloatValues: false,
                infinite: true
            }
        }, function(err, httpResponse, body) {
            console.log(err);
            //console.log(httpResponse);
            console.log(body);
            process.exit();
        });
    });
});