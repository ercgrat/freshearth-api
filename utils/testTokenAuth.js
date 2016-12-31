'use strict';
const request = require('request');
request.post({
    url: 'http://45.55.250.153:8000/api/test',
    headers: {
        'Authorization': 'JWT eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6MiwiZXhwaXJlcyI6MTQ3ODQ3NjUxNTU1NX0.DmvMZNVqpSbPtb4mIGpGAOO0WoNC_1l42KsqtLcYFLQ'
    },
}, function(err, httpResponse, body) {
    //console.log(err);
    //console.log(httpResponse);
    //console.log(body);
    console.log("Post complete");
});

return;