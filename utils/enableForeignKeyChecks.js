'use strict';
const database = require('../database.js')();

database.query('SET FOREIGN_KEY_CHECKS = 0', function(error, results, fields) {
    if(error) {
        console.error(error);
    } else {
        console.log("Enabled foreign key checks.");
    }
});

return;