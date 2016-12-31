'use strict';
const database = require('../database.js')();
console.log("******* ALWAYS FOLLOW THIS SCRIPT BY RUNNING enableForeignKeyChecks.js *******");

var tables = ["User", "Product", "Order", "Business", "OrderEvent", "Address"];
database.query('SET FOREIGN_KEY_CHECKS = 0', function(error, results, fields) {
    for(var i = 0; i < tables.length; i++) {
        var table = tables[i];
        console.log("Clearing " + table + " table.");
        database.query('TRUNCATE `' + table + "`", [], function(error, results, fields) {
            if(error) {
                console.log(error);
            }
        });
    }
});

return;
