"use strict";
const express = require('express');
const Promise = require('bluebird');
const moment = require('moment');

module.exports = function(api, router, database) {
	
	var message = express.Router();
    router.use('/message', message);

    var utils = api.get('utils');
    var messageValidator = api.get('validationRetriever')('Message');
    
    function createConversation(trx) {
        return database.transacting(trx)
        .insert({}, 'id')
        .into('Conversation');
    }
    
    function checkMember(trx, conversation, business) {
        return database.transacting(trx)
        .forShare()
        .select('*')
        .from('ConversationMember')
        .where({
            conversation: conversation,
            business: business
        })
        .then(function(rows) {
            if(rows.length === 1) {
                return true;
            } else {
                return false;
            }
        });
    }
    
    function addMember(trx, conversation, business) {
        return checkMember(trx, conversation, business)
        .then(function(isMember) {
            if(!isMember) {
                return database.transacting(trx)
                .insert({
                    conversation: conversation,
                    business: business
                })
                .into('ConversationMember');
            } else {
                var error = new Error("This business (id = " + business + ") is already a member of the conversation.");
                error.status = 403;
                throw error;
            }
        });
    }
	
	message.post('/conversation/create', function(req, res, next) {
		// Validation
        var businessTypeError = utils.checkBusinessTypes(["Consumer", "Producer", "Distributor"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }
        
        var conversation = req.body.v;
        var paramError = utils.checkParameters(["businesses"], conversation);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }
        
        var validationErrors = utils.typeCheck("Conversation", conversation);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }
        
        // Query
        database.transaction(function(trx) {
            var dataCache = {};
            return createConversation(trx)
            .then(function(conversationId) {
                dataCache.conversationId = conversationId;
                return addMember(trx, conversationId, req.user.businessId);
            })
            .then(Promise.map(conversations.businesses, addMember.bind(null, trx, dataCache.conversationId)))
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function() {
            res.status(200).send();
        })
        .catch(function(error) {
            return utils.generateResponseObject(error);
        });
	});
    
    function getMostRecentMessage() {
        return database.max('sent')
        .from('Message')
        .whereRaw('conversation = Conversation.id');
    }
    
    function getConversations(member, startIndex, amount) {
        return database.select('Conversation.id AS id', 'Message.sent AS sent', 'Message.content AS content')
        .from('Conversation')
        .join('ConversationMember', 'Conversation.id', 'ConversationMember.conversation')
        .where('ConversationMember.member', member)
        .join('Message', 'Conversation.id', 'Message.conversation')
        .whereRaw('Message.sent', getMostRecentMessage)
        .limit(amount)
        .offset(startIndex);
    }
    
    function getConversationMembers(conversation) {
        return database.select('Business.id AS businessId', 'Business.name AS businessName')
        .from('Business')
        .join('ConversationMember', 'Business.id', 'ConversationMember.member')
        .where('ConversationMember.conversation', conversation);
    }
    
    message.get('/conversation/list', function(req, res, next) {
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Consumer", "Producer", "Distributor"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }
        
        var body = req.body.v;
        /*var paramError = utils.checkParameters([], body);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }*/
        
        var validationErrors = utils.typeCheck("ConversationListRequest", body);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }
        
        // Query
        var dataCache = {};
        getConversations(req.user.businessId, body.startIndex, body.amount)
        .then(function(conversations) {
            dataCache.conversations = conversations;
            return Promise.map(conversations, getConversationMembers);
        })
        .then(function() {
            res.status(200).send(dataCache.conversations);
        })
        .catch(function(error) {
            return utils.generateResponseObject(error);
        });
    });
    
    message.post('/conversation/addMember', function(req, res, next) {
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Consumer", "Producer", "Distributor"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }
        
        var conversationMember = req.body.v;
        var paramError = utils.checkParameters(["conversation", "member"], conversationMember);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }
        
        var validationErrors = utils.typeCheck("ConversationMember", conversationMember);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }
        
        // Query
        database.transaction(function(trx) {
            return addMember(trx, conversationMember.conversation, conversationMember.member)
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function() {
            res.status(200).send();
        })
        .catch(function(error) {
            return utils.generateResponseObject(error);
        });
    });
    
    function addMessage(trx, conversation, author, content) {
        return checkMember(trx, conversation, author)
        .then(function(isMember) {
            if(isMember) {
                return database.transacting(trx)
                .insert({
                    conversation: conversation,
                    author: author,
                    content: content
                }, 'id')
                .into('Message');
            } else {
                var error = new Error("This business (id = " + author + ") is not a member of the conversation, so cannot author a message.");
                error.status = 403;
                throw error;
            }
        });
    }
    
    message.post('/add', function(req, res, next) {
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Consumer", "Producer", "Distributor"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }
        
        var message = req.body.v;
        var paramError = utils.checkParameters(["conversation", "content"], message);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }
        
        var validationErrors = utils.typeCheck("Message", message);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }
        
        // Query
        database.transaction(function(trx) {
            return addMessage(trx, message.conversation, req.user.businessId, message.content)
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function() {
            res.status(200).send();
        })
        .catch(function(error) {
            return utils.generateResponseObject(error);
        });
    });
};