'use strict';
const request = require('request');

request.post({
    url:'http://45.55.250.153:8001/api/auth/signupAsConsumer',
    form: {
        v: {
            email:'ercgrat@gmail.com',
            password:'L3ttuceMakeCa$h',
            firstName:'Kim',
            lastName:'Chi',
            businessName:'Utopia farms'
        }
    }
}, function(err, httpResponse, body) {
    console.log(err);
    console.log(body);
});