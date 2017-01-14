"use strict";
const _ = require('lodash');
const emailValidator = require('email-validator');
const phoneValidator = require('phone');
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&+\-%^=])[A-Za-z\d@$!%*#?&+\-%^=]{8,}$/;
const zipRegex = /^\d{5}$/;

module.exports = function(api) {
    const typeDefinitions = require('./types.js')(api);
    /*
     *   Lodash function mappings
     */
    function isArray(value) {
        return _.isArrayLikeObject(value);
    }

    function isBoolean(value) {
        return _.isBoolean(value) || value === 'true' || value === 'false';
    }

    function isTrue(value) {
        return value === true || value === 'true';
    }

    function isFalse(value) {
        return value === false || value === 'false';
    }

    function isFloat(value) {
        return _.isFinite(Number(value)) && !isInt(value);
    }

    function isInt(value) {
        return _.isInteger(Number(value));
    }

    function isUnsignedInt(value) {
        return isInt(value) && Number(value) >= 0;
    }

    function isUnsignedFloat(value) {
        return isNumeric(value) && Number(value) >= 0;
    }

    function isPositive(value) {
        return Number(value) > 0;
    }

    function isNumeric(value) {
        return _.isFinite(Number(value));
    }

    function isObject(value) {
        return _.isObjectLike(value);
    }

    function isSet(value) {
        return !_.isNil(value);
    };

    function isString(value) {
        return _.isString(value);
    }

    function includes(array, value) {
        return _.includes(array, value);
    }

    function forEach(obj, func) {
        return _.forEach(obj, func);
    }
    
    function replace(string, pattern, replacement) {
        return _.replace(string, pattern, replacement);
    }

    /*
     *  Checks if value is valid SQL id (an unsigned integer)
     */
    function isValidSQLId(value) {
        return isUnsignedInt(value) && isPositive(value);
    }

    /*
     *  Checks if value is a valid e-mail string
     */
    function isValidEmail(value) {
        return emailValidator.validate(value);
    }

    /*
     *  Checks if value is a valid US phone number
     */
    function isValidPhone(value) {
        console.log(typeof value + ' ' + value);
        return phoneValidator(value, 'USA').length > 0; // it returns an empty array if invalid, and ['<phone#>','<country>'] on success
    }

    /*
     *  Checks if value is a zip code (5 digits)
     */
    function isValidZip(value) {
        return zipRegex.test(value);
    }

    /*
     *  Checks if value is a valid password string
     */
    function isValidPassword(value) {
        return passwordRegex.test(value);
    }

    /*
     *  Checks if (string) value is a valid order event type
     */
    function isOrderEventType(value) {
        return isSet(orderEventIds[value]);
    }

    /*
     *  Method to generate Error Responses for all cases
     *
     *  @arguments
     *    error:  The error provided by the Express Middleware or MySQL Service
     *    status: HTTP Status Code
     *            Integer
     *            Optional
     *            Default: 400
     *    args: Additional information to send with the response
     *            Object
     *
     **/
    function generateResponseObject(errors, status, args) {
        var res = null;
        if (isSet(errors)) {
			if(typeof errors === "string") {
				errors = [ JSON.stringify(errors, Object.getOwnPropertyNames(errors)) ];
			} else { // array type
				for(var i = 0; i < errors.length; i++) {
					errors[i] = JSON.stringify(errors[i], Object.getOwnPropertyNames(errors[i]));
				}
			}
            res = {
                error: errors,
                status: status || 403,
                args: args || null
            }
        }
        return res;
    };
    
    function rowsToDictionary(rows, key) {
        var dict = {};
        _.forEach(rows, function(row) {
            dict[row[key]] = row;
        });
        return dict;
    }

    var typeChecks = {
        "bool": isBoolean,
        "int": isInt,
        "sqlid": isValidSQLId,
        "float": isNumeric,
        "string": isString,
        "email": isValidEmail,
        "phone": isValidPhone,
        "zip": isValidZip,
        "password": isValidPassword,
        "orderEvent": isOrderEventType,
        "array": isArray,
        "object": isObject
    };

    const userNotVerifiedError = (function() {
        var error = new Error("User must be verified to access this route.");
        error.status = 403;
        return error;
    })();
	
	function convertFromDatabase(definitionKey, value) {
		var definition = typeDefinitions[definitionKey];
		return convertFromDatabaseRecursive(definition, value, []);
	}
	
	function convertArrayFromDatabaseOfType(definitionKey, value) {
		var rootName = definitionKey + "Array";
        var definition = {
            type: "array",
            arrType: definitionKey
        };
        return convertFromDatabaseRecursive(definition, value, []);
	}
	
	function convertFromDatabaseRecursive(definition, value, keys) {
		var obj = value;
		var type = definition.type;
		for(var i = 0; i < keys.length - 1; i++) {
			obj = obj[keys[i]];
		}
		if(isSet(typeChecks[type])) {
			if(type !== "array" && type !== "object") {
				switch(type) {
					case "bool":
						obj[keys[keys.length - 1]] = obj[keys[keys.length-1]] == 1 ? true : false;
						break;
					default:
						break;
				}
			} else {
				if(keys.length > 0) {
					obj = obj[keys[keys.length - 1]];
				}
				switch(type) {
					case "array":
						for(var i = 0; i < obj.length; i++) {
							var subKeys = _.clone(keys);
							subKeys.push(i);
							convertFromDatabaseRecursive(typeDefinitions[definition.arrType], value, subKeys);
						}
						break;
					case "object":
						forEach(definition.definition, function(subdef, key) {
							var subKeys = _.clone(keys);
							subKeys.push(key);
							convertFromDatabaseRecursive(subdef, value, subKeys);
						});
						break;
				}
			}
		}
	}

    function typeCheck(definitionKey, value) {
        console.log(definitionKey);
        console.log(value);
        var definition = typeDefinitions[definitionKey];
        return typeCheckRecursive(definition, value, definitionKey);
    }

    function typeCheckArrayOfType(definitionKey, value) {
        var rootName = definitionKey + "Array";
        var definition = {
            type: "array",
            arrType: definitionKey,
            required: true
        };
        return typeCheckRecursive(definition, value, rootName);
    }

    function typeCheckRecursive(definition, value, name) {
        var errors = [];
        console.log(definition);
        var type = definition.type;
        console.log('defined');
        if (!isSet(value)) {
            if (definition.required) {
                errors.push(new Error("Value '" + name + "' of type '" + type + "' is not set."));
            }
        } else {
            if (isSet(typeChecks[type])) {
                // do primitive type check
                if (!typeChecks[type](value)) {
                    errors.push(new Error("Value '" + name + "' does not match type '" + definition.type + "'."));
                } else {
                    // Recurse or continue validating according to type
                    switch (type) {
                        case "int":
                            if (definition.positive && !isPositive(value)) {
                                errors.push(new Error("Integer '" + name + "' needs to be positive, but is less than or equal to zero."));
                            }
                            if (definition.unsigned && !isUnsignedInt(value)) {
                                errors.push(new Error("Integer '" + name + "' is negative but needs to be unsigned."));
                            }
                            break;
                        case "float":
                            if (definition.positive && !isPositive(value)) {
                                errors.push(new Error("Float '" + name + "' needs to be positive, but is less than or equal to zero."));
                            }
                            if (definition.unsigned && !isUnsignedFloat(value)) {
                                errors.push(new Error("Float '" + name + "' is negative, but needs to be unsigned."));
                            }
                            break;
                        case "string":
                            if (definition.minlength && value.length < definition.minlength) {
                                errors.push(new Error("String '" + name + "' does not meet the minimum length required (" + definition.minlength + ")."));
                            }
                            if (definition.maxlength && value.length > definition.maxlength) {
                                errors.push(new Error("String '" + name + "' exceeds the maximum length allowed (" + definition.maxlength + ")."));
                            }
                            break;
                        case "array":
                            if (definition.minlength) {
                                if (value.length < definition.minlength) {
                                    errors.push(new Error("Array '" + name + "' does not meet the minimum length required (" + definition.minlength + ")."));
                                }
                            }
                            if (definition.maxlength) {
                                if (value.length > definition.maxlength) {
                                    errors.push(new Error("Array '" + name + "' exceeds the maximum length allowed (" + definition.maxlength + ")."));
                                }
                            }
                            var arrType = typeDefinitions[definition.arrType] || definition.arrType; // Try object definition, else primitive
                            for (var i = 0; i < value.length; i++) {
                                errors = errors.concat(typeCheckRecursive(arrType, value[i], name + "[" + i + "]"));
                            }
                            break;
                        case "object":
                            forEach(definition.definition, function(subdef, key) {
                                errors = errors.concat(typeCheckRecursive(subdef, value[key], name + "." + key));
                            });
                            if (errors.length == 0 && definition.customValidation) {
                                errors = errors.concat(definition.customValidation(name, value));
                            }
                            break;
                    }
                }
            } else { // Cropolis type check
                errors = errors.concat(typeCheckRecursive(typeDefinitions[type], value, name + "." + type));
            }
        }

        return errors;
    }

    const businessTypes = {
        "Consumer": 1,
        "Producer": 2,
        "Distributor": 3
    };

    const orderEventIds = {
        "Create": 1,
        "Cancel": 2,
        "Decline": 3,
        "Approve": 4,
        "Process": 5,
        "Deliver": 6,
        "ProducerRequestChange": 7,
        "ApproveChangeRequest": 8,
        "Dispute": 9,
        "ResolveDispute": 10,
        "Update": 11,
        "ConsumerRequestChange": 12,
        "DeclineChangeRequest": 13,
        "CancelChangeRequest": 14
    };

    const orderEventTypes = {
        1: "Create",
        2: "Cancel",
        3: "Decline",
        4: "Approve",
        5: "Process",
        6: "Deliver",
        7: "ProducerRequestChange",
        8: "ApproveChangeRequest",
        9: "Dispute",
        10: "ResolveDispute",
        11: "Update",
        12: "ConsumerRequestChange",
        13: "DeclineChangeRequest",
        14: "CancelChangeRequest"
    };

    return {
        /*
         *   Convenience function for getting the SQL id of a business type.
         *
         *   type    - String form of the business type (e.g. "Producer")
         */
        getBusinessTypeId: function(type) {
            return businessTypes[type];
        },

        /*
         *   Convenience function for getting the SQL id of a business type.
         *
         *   type    - String form of the business type (e.g. "Producer")
         */
        getOrderEventTypeId: function(type) {
            return orderEventIds[type];
        },

        /*
         *   Convenience function for getting the SQL id of a business type.
         *
         *   type    - String form of the business type (e.g. "Producer")
         */
        getOrderEventTypeName: function(id) {
            return orderEventTypes[id];
        },

        /*
         *   Function that checks if the business type on the JSON Web Token is in the provided list of allowed business types.
         *
         *   allowedTypes - Array of strings containing allowed business type names (e.g. ["Consumer", "Producer"]).
         *   userToken    - JSON Web Token provided with every authorized route (req.user)
         */
        checkBusinessTypes: function(allowedTypes, userToken) {
            if (!includes(allowedTypes, userToken.businessType)) {
                return "Businesses Type " + userToken.businessType + " may not access this method."
            }
            return false;
        },

        /*
         *   Function that checks the body object for required parameters and returns an error if any are missing.
         *
         *   required - Array of strings containing required parameter names.
         *   body     - POST body of the request (req.body)
         */
        checkParameters: function(required, body) {
            var missing = [];
            for (var i = 0; i < required.length; i++) {
                if (!isSet(body[required[i]])) {
                    missing.push(required[i]);
                }
            }
            if (missing.length > 0) {
                return "Missing Required Parameters: " + missing.toString();
            }
            return false;
        },

        userNotVerifiedError: userNotVerifiedError,

        generateResponseObject: generateResponseObject,
        
        rowsToDictionary: rowsToDictionary,

        isBoolean: isBoolean,

        isInt: isInt,

        isFloat: isFloat,

        isTrue: isTrue,

        isFalse: isFalse,

        isNumeric: isNumeric,
		
		isPositive: isPositive,

        isSet: isSet,

        isValidSQLId: isValidSQLId,

        isString: isString,

        isObject: isObject,

        isArray: isArray,

        includes: includes,

        forEach: forEach,
        
        replace: replace,

        typeCheck: typeCheck,

        typeCheckArrayOfType: typeCheckArrayOfType,
		
		convertFromDatabase: convertFromDatabase,
		
		convertArrayFromDatabaseOfType: convertArrayFromDatabaseOfType
    };
};
