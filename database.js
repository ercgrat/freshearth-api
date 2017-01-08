"use strict";

module.exports = function(verbose) {
    var database = require('knex')({
        client: 'mysql',
        connection: {
            host: '127.0.0.1',
            user: 'fe-server',
            password: 'farmersFirst#2017',
            database: 'freshearth'
        },
        debug: verbose
	});
	
	return database;
};