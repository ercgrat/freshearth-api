"use strict";
/*
 *   Validators for the Business table
 */

module.exports = function(utils) {
    return {
        requiredArgs: ['owner', 'name', 'address', 'phone', 'headline'],
        validate: function(args) {
            var errorMessage = null;
            if(!utils.isValidSQLId(args["owner"])) {
                errorMessage = "Owner parameter must be a numeric id.";
            }
            else if(!utils.isValidSQLId(args["address"])) {
                errorMessage = "Address parameter must be a numeric id.";
            }
            return errorMessage;
    };
};
