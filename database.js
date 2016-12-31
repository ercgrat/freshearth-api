"use strict";

module.exports = function(verbose) {
    var database = require('knex')({
        client: 'mysql',
        connection: {
            host: '127.0.0.1',
            user: 'root',
            password: 'croptopolis',
            database: 'cropolis'
        },
        debug: verbose
	});
	
	return database;
};