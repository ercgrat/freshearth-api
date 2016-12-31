"use strict";
/*
 *   Validators for the User table
 */
const emailValidator = require('email-validator');
const Promise = require('bluebird');

module.exports = function(utils) {
    var passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&+\-%^=])[A-Za-z\d@$!%*#?&+\-%^=]{8,}$/;
    return {
        passwordRegex: passwordRegex,
        requiredArgs: ["email", "password", "firstName", "lastName"],
        validate: function(args) {
            var errorMessage = null;
            if (!emailValidator.validate(args["email"])) {
                errorMessage = "Invalid e-mail address.";
            } else if (args["password"].length < 8) {
                errorMessage = "Password must be at least 8 characters long.";
            } else if (!passwordRegex.test(args["password"])) {
                errorMessage = "Password must have at least one letter, one number, and one symbol (?!@#$%^&*-+=).";
            } else if (args["firstName"].length < 1) {
                errorMessage = "Please provide a first name.";
            } else if (args["lastName"].length < 1) {
                errorMessage = "Please provide a last name.";
            }
            return errorMessage;
        }
    };
};
