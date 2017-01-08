"use strict";
const express = require('express');
const Promise = require('bluebird');

module.exports = function(api, router, database) {

    var contact = express.Router();
    router.use('/contact', contact);

    var utils = api.get('utils');
    var contactValidator = api.get('validationRetriever')('Contact');
    
    function checkForBusiness(trx, email) {
        return database.transacting(trx)
        .forShare()
        .select('Business.id')
        .from('Business')
        .join('User', 'Business.owner', 'User.id')
        .where('User.email', email)
        .then(function(rows) {
            if(rows.length == 1) {
                return true;
            } else {
                return false;
            }
        });
    }
    
    function createContact(trx, name, email) {
        return database.transacting(trx)
        .insert({
            name: name,
            email: email
        }, 'id')
        .into('Contact');
    }
    
    function getDefaultGroup(trx, owner) {
        return database.transacting(trx)
        .forUpdate()
        .select('id')
        .from('ContactGroup')
        .where({
            name: "",
            owner: owner,
            custom: false
        })
        .then(function(rows) {
            return rows[0].id;
        });
    }
    
    function addContactToGroup(trx, contact, group) {
        return database.transacting(trx)
        .insert({
            group: group,
            contactMember: contact
        })
        .into('ContactGroupMember');
    }
    
    function addContactToDefaultGroup(trx, owner, contact) {
        return getDefaultGroup(trx, owner)
        .then(function(groupId) {
            return addContactToGroup(trx, contact, groupId);
        });
    }
    
    contact.post('', function(req, res, next) {
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Consumer", "Producer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }
        
        var contact = req.body.v;
        var paramError = utils.checkParameters(["name", "email"], contact);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }
        
        var validationErrors = utils.typeCheck("Contact", contact);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }
        
        // Query
        database.transaction(function(trx) {
            return checkForBusiness(trx, contact.email)
            .then(function(businessExists) {
                if(businessExists) {
                    var error = new Error("A business with that e-mail address already exists.");
                    error.status = 403;
                    throw error;
                }
                return createContact(trx, contact.name, contact.email);
            })
            .then(function(contactId) {
                return addContactToDefaultGroup(trx, req.user.businessId, contactId);
            })
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function(contact) {
            res.status(200).send({ id: contact });
        })
        .catch(function (error) {
            return next(utils.generateResponseObject(error));
        });
    });
	
    function getContacts(trx, businessId) {
        return database.transacting(trx)
        .select('Contact.id', 'Contact.name', 'Contact.email')
        .from('Contact')
        .join('ContactGroupMember', 'Contact.id', 'ContactGroupMember.contactMember')
        .join('ContactGroup', 'ContactGroupMember.group', 'ContactGroup.id')
        .where('ContactGroup.owner', businessId);
    }
    
    function getContactBusinesses(trx, businessId) {
        return database.transacting(trx)
        .select('Business.id', 'Business.name', 'User.email')
        .from('Business')
        .join('User', 'Business.owner', 'User.id')
        .join('ContactGroupMember', 'Business.id', 'ContactGroupMember.businessMember')
        .join('ContactGroup', 'ContactGroupMember.group', 'ContactGroup.id')
        .where('ContactGroup.owner', businessId);
    }
    
    function getBusinessContactGroups(trx, businessId) {
        return database.transacting(trx)
        .select('id', 'name', 'custom')
        .from('ContactGroup')
        .where('owner', businessId);
    }
    
    function getBusinessContactGroupMembers(trx, businessId) {
        return database.transacting(trx)
        .select('ContactGroupMember.contactMember', 'ContactGroupMember.businessMember', 'ContactGroupMember.group')
        .from('ContactGroupMember')
        .join('ContactGroup', 'ContactGroupMember.group', 'ContactGroup.id')
        .where('ContactGroup.owner', businessId);
    }
    
    function deleteContactFromAllGroups(trx, id) {
        return database.transacting(trx)
        .select('ContactGroup.id')
        .from('ContactGroup')
        .join('ContactGroupMember', 'ContactGroup.id', 'ContactGroupMember.group')
        .where('ContactGroupMember.contactMember', id)
        .then(function(rows) {
            return Promise.map(rows, function(group) {
                return deleteContactFromOneGroup(trx, id, group.id);
            });
        })
        .then(function() {
            return database.transacting(trx)
            .del()
            .into('Contact')
            .where('id', id);
        });
    }
    
    function deleteContactFromOneGroup(trx, id, group) {
        return database.transacting(trx)
		.del()
		.into('ContactGroupMember')
		.where({
			'contactMember': id,
			'group': group
		});
    }
	
	function deleteContactMember(trx, owner, contactMember, group) {
        return database.transacting(trx)
        .select('custom')
        .from('ContactGroup')
        .where({
            'id': group,
            'owner': owner
        })
        .then(function(rows) {
            if(rows.length != 1) {
                throw new Error("Group does not exist.");
            }
            var custom = rows[0].custom;
            if(custom) {
                return deleteContactFromOneGroup(trx, contactMember, group);
            } else {                
                return deleteContactFromAllGroups(trx, contactMember);
            }
        });
	}
	
	contact.delete('/member', function(req, res, next) {
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Consumer", "Producer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }

        var member = { contactMember: req.query.contactMember, group: req.query.group };
        var paramError = utils.checkParameters(["contactMember", "group"], member);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }

        var validationErrors = utils.typeCheck("ContactGroupMember", member);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }
        
        // Query
        database.transaction(function(trx) {
            return deleteContactMember(trx, req.user.businessId, member.contactMember, member.group)
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function() {
            res.status(200).send();
        })
        .catch(function(error) {
            return next(utils.generateResponseObject(error));
        });
    });
    
    contact.get('/business/:id', function(req, res, next) {
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Consumer", "Producer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }
        
        var businessId = req.params.id;
        if(!utils.isValidSQLId(businessId)) {
            var error = new Error("The id specified is not a positive integer.");
            error.status = 400;
            return next(utils.generateResponseObject(error));
        }
        
        // Query
        var dataCache = {};
        database.transaction(function(trx) {
            return getContacts(trx, businessId)
            .then(function(contacts) {
                dataCache.contacts = contacts;
                return getContactBusinesses(trx, businessId);
            })
            .then(function(businesses) {
                dataCache.businesses = businesses;
                return getBusinessContactGroups(trx, businessId);
            })
            .then(function(groups) {
                dataCache.groups = groups;
                return getBusinessContactGroupMembers(trx, businessId);
            })
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function(members) {
            res.status(200).send({
                businesses: dataCache.businesses,
                contacts: dataCache.contacts,
                groups: dataCache.groups,
                members: members
            });
        })
        .catch(function(error) {
            return next(utils.generateResponseObject(error));
        });
    });
    
    function createCustomContactGroup(trx, owner, name) {
        return database.transacting(trx)
        .insert({
            owner: owner,
            name: name,
            custom: true
        }, 'id')
        .into('ContactGroup')
        .then(function(rows) {
            return rows[0];
        });
    }
    
    contact.post('/group', function(req, res, next) {
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Consumer", "Producer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }
        
        var contactGroup = req.body.v;
        var paramError = utils.checkParameters(["name"], contactGroup);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }
        
        var validationErrors = utils.typeCheck("ContactGroup", contactGroup);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }
        
        // Query
        database.transaction(function(trx) {
            return createCustomContactGroup(trx, req.user.businessId, contactGroup.name)
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function(contactGroup) {
            res.status(200).send({ id: contactGroup });
        })
        .catch(function(error) {
            return next(utils.generateResponseObject(error));
        });
    });
	
	function updateGroupName(trx, owner, id, name) {
		return database.transacting(trx)
		.update('name', name)
		.into('ContactGroup')
		.where({
			'id': id,
			'owner': owner
		});
	}
	
    contact.put('/group', function(req, res, next) {
		// Validation
        var businessTypeError = utils.checkBusinessTypes(["Consumer", "Producer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }
        
        var group = req.body.v;
        var paramError = utils.checkParameters(["id", "name"], group);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }
        
        var validationErrors = utils.typeCheck("ContactGroup", group);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }
        
        // Query
        database.transaction(function(trx) {
            return updateGroupName(trx, req.user.businessId, group.id, group.name)
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function(contact) {
            res.status(200).send();
        })
        .catch(function (error) {
            return next(utils.generateResponseObject(error));
        });
	});
	
    function deleteGroup(trx, id, owner) {
        return database.transacting(trx)
        .del()
        .into('ContactGroup')
        .where({
            'id': id,
            'owner': owner
        });
    }
    
    contact.delete('/group/:id', function(req, res, next) {
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Consumer", "Producer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }

        var group = { id: req.params.id };
        var paramError = utils.checkParameters(["id"], group);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }

        var validationErrors = utils.typeCheck("DeleteRequest", group);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }

        // Query
        database.transaction(function(trx) {
            return deleteGroup(trx, group.id, req.user.businessId)
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function() {
            res.status(200).send();
        })
        .catch(function(error) {
            return next(utils.generateResponseObject(error));
        });
    });
    
    function checkGroupMember(trx, contact, group) {
        return database.transacting(trx)
        .forShare()
        .select('*')
        .from('ContactGroupMember')
        .where({
            group: group,
            contactMember: contact
        })
        .then(function(rows) {
            if(rows.length === 1) {
                return true;
            } else {
                return false;
            }
        });
    }
    
    contact.post('/member', function(req, res, next) {
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Consumer", "Producer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }
        
        var member = req.body.v;
        var paramError = utils.checkParameters(["contactMember", "group"], member);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }
        
        var validationErrors = utils.typeCheck("ContactGroupMember", member);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }
        
        // Query
        database.transaction(function(trx) {
            return checkGroupMember(trx, member.contactMember, member.group)
            .then(function(isGroupMember) {
                if(isGroupMember) {
                    throw new Error("This contact is already a member of this group.");
                }
                return addContactToGroup(trx, member.contactMember, member.group);
            })
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function() {
            res.status(200).send();
        })
        .catch(function(error) {
            return next(utils.generateResponseObject(error));
        });
    });
};