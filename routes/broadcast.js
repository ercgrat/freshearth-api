"use strict";
const express = require('express');
const Promise = require('bluebird');

module.exports = function(api, router, database) {

    var broadcast = express.Router();
    router.use('/broadcast', broadcast);
    var amazon = api.get('amazon');
    var utils = api.get('utils');
    
    function getContactEmail(owner, id) {
        return database.select('Contact.email')
        .from('Contact')
        .join('ContactGroupMember', 'Contact.id', 'ContactGroupMember.contactMember')
        .join('ContactGroup', 'ContactGroupMember.group', 'ContactGroup.id')
        .where({
            'ContactGroup.owner': owner,
            'Contact.id': id
        })
        .then(function(rows) {
            if(rows.length == 0) {
                throw new Error("This contact is not a member of a group owned by this user.");
            } else {
                return rows[0].email;
            }
        });
    }
    
    function getBusinessName(id) {
        return database.select('name')
        .from('Business')
        .where('id', id)
        .then(function(rows) {
            if(rows.length == 0) {
                throw new Error("Did not find the business in the database.");
            } else {
                return rows[0].name;
            }
        });
    }
        
    broadcast.post('/send', function(req, res, next) {
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Producer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }
        
        var email = req.body.v;
        var paramError = utils.checkParameters(["recipients"], email);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }
        
        var validationErrors = utils.typeCheck("Broadcast", email);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }
        
        // Query
        var recipientBlocks = [];
        Promise.each(email.recipients, function(contact, index) {
            if(index % 50 == 0) {
                recipientBlocks.push([]);
            }
            return getContactEmail(req.user.businessId, contact.id)
            .then(function(email) {
                recipientBlocks[recipientBlocks.length - 1].push(email);
            });
        })
        .then(function() {
            return getBusinessName(req.user.businessId);
        })
        .then(function(name) {
            var params = {
                Destination: {},
                Message: {
                    Subject: {
                        Data: 'Welcome to Fresh Earth!'
                    },
                    Body: {
                        Html: {
                            Data: amazon.ses.templates.generic("Welcome to Fresh Earth!", "Please click the link below to verify your account.", null, "VERIFY ACCOUNT", "https://app.freshearth.io/")
                        }
                    }
                },
                Source: name + ' <noreply@freshearth.io>'
            };
            console.log(params.Message.Body.Html.Data);
            utils.forEach(recipientBlocks, function(recipients) {
                params.Destination.BccAddresses = recipients;
                amazon.ses.connection.sendEmail(params, function(error, data) {
                    if(error) {
                        return next(utils.generateResponseObject(error));
                    } else {
                        res.status(200).send();
                    }
                });
            });
        });
    });
};