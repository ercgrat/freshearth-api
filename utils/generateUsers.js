'use strict';
const request = require('request');
/*var users = [
    {
        email:'support@cropolis.co',
        password:'c4$hcropolis',
        firstName:'Crop',
        lastName:'Topolis'
    },
    {
        email:'operations@cropolis.co',
        password:'Crop+0lis',
        firstName:'Test',
        lastName:'User'
    }
];

for(var key in users) {
    request.post({
        url: 'http://45.55.250.153:8001/api/auth/signup',
        form: {
            v: users[key]
        },
    }, function(err, httpResponse, body) {
        //console.log(err);
        //console.log(httpResponse);
        //console.log(body);
        console.log("Post complete");
    });
}
*/

request.post({
    url:'http://45.55.250.153:8001/api/auth/signupAsFarm',
    form: {
        v: {
            email:'operations@cropolis.co',
            password:'L3ttuceMakeCa$h',
            firstName:'Don',
            lastName:'Giovanni',
            businessName:'Mega farm',
            businessAddress: {
                street: "27 First St",
                city: "Nesconset",
                zip: "11767",
                state: "New York"
            },
            businessPhone: "1234567890",
            businessHeadline: "We grow the BIGGEST produce."
        }
    }
});

return;