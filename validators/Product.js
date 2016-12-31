"use strict";
/*
 *   Validators for the Product table
 */

module.exports = function(utils) {
    return {
        requiredArgs: ["category", "name", "available", "quantityAvailable", "price", "unit", "allowFloatValues", "infinite"]
    };
};
