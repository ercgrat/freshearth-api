'use strict';
const request = require('request');

request.post({
    url:'http://45.55.250.153:8000/api/auth/signupAsFarm',
    form: {
        v: {
            email:'fakemail@cropolis.co',
            password:'L3ttuceMakeCa$h',
            firstName:'Don',
            lastName:'Giovanni',
            businessName:'Fake Mega farm',
            businessAddress: {
                street: "27 First St",
                city: "Nesconset",
                zip: "11767",
                state: "New York"
            },
            businessPhone: 7174717173,
            businessHeadline: "We grow the BIGGEST produce."
        }
    }
});

return;
