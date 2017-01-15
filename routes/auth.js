'use strict';
const express = require('express');
const passportLocalStrategy = require('passport-local').Strategy;
const passportJWTStrategy = require('passport-jwt').Strategy;
const passportJWTExtract = require('passport-jwt').ExtractJwt;
const jwt = require('jwt-simple');
const moment = require('moment');
const bcrypt = require('bcryptjs');
const phoneValidator = require('phone');

module.exports = function(api, router, database, passport, utils) {

    var auth = express.Router();
    router.use('/auth', auth);

    api.set('jwtSecret', 'TGL38nWRY1fe1TSAhjeRD2rfIY6p2i958Ps6JbZLWIAvRsAEG1Is0XhpFzqbyOMoWsCYB8923A5OAXps83FYKZoZ7sN9YGLPhGxMVTOdKhHIiy3zWoZiHm4h2tr9Xlmr');
    var utils = api.get('utils');
    var amazon = api.get('amazon');
    var userValidator = api.get('validationRetriever')('User');

    function getSecurityData(password) {
        var salt = bcrypt.genSaltSync(10);
        var hash = bcrypt.hashSync(password, salt);
        return {
            salt: salt,
            hash: hash
        };
    }

    function getAuthToken(id, email, verified, admin, businessId, businessType, expires) {
        return "JWT " + jwt.encode({
            id: id,
            email: email,
            verified: verified,
            admin: admin,
            businessId: businessId,
            businessType: businessType,
            expires: expires
        }, api.get('jwtSecret'));
    }

    function getVerificationToken(email) {
        return jwt.encode({
            email: email,
            expires: moment().add(1, 'days').valueOf()
        }, api.get('jwtSecret'));
    }

    // Configuration for Passport strategies
    passport.serializeUser(function(user, done) {
        done(null, user);
    });
    passport.deserializeUser(function(user, done) {
        done(null, user);
    });

    // Configuration of Passport's local auth strategy
    passport.use(new passportLocalStrategy({
        session: false,
        usernameField: 'email',
    }, function(email, password, done) {

        database.select('User.id', 'User.salt', 'User.password', 'User.verified', 'User.admin', 'Business.name AS businessName', 'Business.id AS businessId', 'BusinessType.name AS businessType')
		.from('User')
		.leftOuterJoin('Business', 'Business.owner', 'User.id')
		.leftOuterJoin('BusinessType', 'Business.type', 'BusinessType.id')
		.where('User.email', email)
		.then(function(rows) {
			// Incorrect credentials
			if (rows.length !== 1) {
				return done(null, false);
			}

			var user = rows[0];
			var hash = bcrypt.hashSync(password, user.salt);
			if (user.password !== hash) {
				return done(null, false);
			}

			// Construct the web token
			var expires = moment().add(7, 'days').valueOf();
			var token = getAuthToken(user.id, email, user.verified, user.admin, user.businessId, user.businessType, expires);

			// The response object that will get put in req.user
			var response = {
				token: token,
				id: user.id,
				verified: user.verified,
				admin: user.admin,
				businessId: user.businessId,
				businessName: user.businessName,
				businessType: user.businessType,
				expires: expires
			};
			return done(null, response);
		})
		.catch(function(error) {
			return done(error);
		});
    }));

    // Configuration of Passport's JSON Web Token auth strategy
    passport.use(new passportJWTStrategy({
        jwtFromRequest: passportJWTExtract.fromAuthHeader(),
        secretOrKey: api.get('jwtSecret')
    }, function(payload, done) {
        // Here, need to check that the token is valid
        if (moment().isAfter(payload.expires)) {
            return next(utils.generateResponseObject('The login token has expired.'));
        } else {
            var user = {
                id: payload.id,
                email: payload.email,
                verified: payload.verified,
                admin: payload.admin,
                businessType: payload.businessType,
                businessId: payload.businessId
            };
            return done(null, user);
        }
    }));

    // Catches preflighted requests that get sent before sending user credentials
    auth.options('/login', function(req, res, next) {
        console.log("Preflighted login attempt");
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        res.status(200).send();
    });

    auth.post('/login', passport.authenticate('local'), function(req, res, next) {
        var response = req.user; // Passport stores the LocalStrategy success object in req.user
        res.status(200).send(response);
    });

    function createUser(trx, req, securityData) {
        return database.transacting(trx)
            .insert({
                email: req.body.v.email,
                password: securityData.hash,
                salt: securityData.salt,
                firstName: req.body.v.firstName,
                lastName: req.body.v.lastName
            }, 'id')
            .into('User');
    }

    function getStateId(trx, state) {
        return database.transacting(trx)
            .forShare()
            .select('id')
            .from('State')
            .where('name', state)
            .then(function(rows) {
                if (rows.length !== 1) {
                    var error = new Error("No state found matching the provided id.");
                    error.status = 403;
                    throw error;
                }
                return rows[0]["id"];
            });
    }

    function createAddress(trx, street, city, state, zip) {
        return database.transacting(trx)
            .insert({
                lineOne: street,
                lineTwo: city,
                state: state,
                zip: zip
            }, 'id')
            .into('Address');
    }

    function createBusiness(trx, typeString, owner, name, address, phone, headline) {
        return database.transacting(trx)
            .insert({
                type: utils.getBusinessTypeId(typeString),
                owner: owner,
                name: name,
                address: address,
                phone: phone,
                headline: headline
            })
            .into('Business');
    }

    function createDefaultContactGroup(trx, owner) {
        return database.transacting(trx)
            .insert({
                owner: owner,
                name: "",
                custom: false
            }, 'id')
            .into('ContactGroup');
    }
    
    function sendVerificationEmail(email) {
        var params = {
            Destination: {
                BccAddresses: [ email ]
            },
            Message: {
                Subject: {
                    Data: 'Welcome to Fresh Earth!'
                },
                Body: {
                    Html: {
                        Data: amazon.ses.templates.generic("Welcome to Fresh Earth!", "Please click the link below to verify your account.", null, "VERIFY ACCOUNT", "https://app.freshearth.io/verify/" + getVerificationToken(email))
                    }
                }
            },
            Source: 'Fresh Earth <noreply@freshearth.io>'
        };
        amazon.ses.connection.sendEmail(params, function(error, data) {
            if(error) {
                console.log(error);
            }
        });
    }
    
    function verifyUser(trx, email) {
        return database.transacting(trx)
        .select('verified')
        .from('User')
        .where('email', email)
        .then(function(rows) {
            if(rows.length != 1) {
                throw new Error("No user with that e-mail exists.");
            } else {
                if(rows[0].verified == true) {
                    return true;
                } else {
                    return database.transacting(trx)
                    .update('verified', 1)
                    .into('User')
                    .where('email', email);
                }
            }
        });
    }
    
    auth.put('/verify/:token', function(req, res, next) {
        // Validation
        var paramError = utils.checkParameters(['token'], req.params);
        if(paramError) {
            return next(utils.generateResponseObject(paramError));
        }
        
        var token = jwt.decode(req.params.token, api.get('jwtSecret'));
        if(!utils.isSet(token.expires) || !utils.isSet(token.email)) {
            return next(utils.generateResponseObject(new Error("The verification token is missing data.")));
        } else if(moment().isAfter(token.expires)) {
            return next(utils.generateResponseObject(new Error("The verification token has expired.")));
        }
        
        // Query
        database.transaction(function(trx) {
            return verifyUser(trx, token.email)
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

    auth.post('/signupAsFarm', function(req, res, next) {
        var requiredArgs = ['businessName', 'businessAddress', 'businessPhone', 'businessHeadline'].concat(userValidator.requiredArgs);
        var paramError = utils.checkParameters(requiredArgs, req.body.v);
        if (paramError) {
            return next(utils.generateResponseObject(paramError));
        };

        var address = req.body.v.businessAddress;
        address.lineOne = req.body.v.businessAddress.street;
        address.lineTwo = req.body.v.businessAddress.city;
        var business = {
            name: req.body.v.businessName,
            phone: req.body.v.businessPhone,
            headline: req.body.v.businessHeadline,
            address: address
        };
        var validationErrors = utils.typeCheck("User", req.body.v);
        validationErrors = validationErrors.concat(utils.typeCheck("Business", business));
        if (validationErrors.length > 0) {
            return next(utils.generateResponseObject(validationErrors));
        }
        business.phone = phoneValidator(business.phone)[0];

        var securityData = getSecurityData(req.body.v.password);

        database.transaction(function(trx) {
            var dataCache = {};
            return createUser(trx, req, securityData)
                .then(function(user) {
                    dataCache.user = user;
                    return getStateId(trx, req.body.v.businessAddress.state);
                })
                .then(function(stateId) {
                    return createAddress(trx, address.lineOne, address.lineTwo, stateId, address.zip);
                })
                .then(function(addressId) {
                    return createBusiness(trx, "Producer", dataCache.user, business.name, addressId, business.phone, business.headline);
                })
                .then(function(businessId) {
                    return createDefaultContactGroup(trx, businessId);
                })
                .then(trx.commit)
                .catch(trx.rollback);
        }).then(function() {
            sendVerificationEmail(req.body.v.email);
            res.status(200).send();
        }).catch(function(error) {
            return next(utils.generateResponseObject(error));
        });
    });

    auth.post('/signupAsConsumer', function(req, res, next) {
        var requiredArgs = ['businessName'].concat(userValidator.requiredArgs);
        var paramError = utils.checkParameters(requiredArgs, req.body.v);
        if (paramError) {
            return next(utils.generateResponseObject(paramError));
        };

        var address = null;
        if (req.body.v.businessAddress) {
            address = {
                lineOne: req.body.v.businessAddress.street,
                lineTwo: req.body.v.businessAddress.city,
                zip: req.body.v.businessAddress.zip,
                state: req.body.v.businessAddress.state
            };
        }
        var business = {
            name: req.body.v.businessName,
            phone: req.body.v.businessPhone,
            headline: req.body.v.businessHeadline,
            address: address
        };
        var validationErrors = utils.typeCheck("User", req.body.v);
        validationErrors = validationErrors.concat(utils.typeCheck("Business", business));
        if (validationErrors.length > 0) {
            return next(utils.generateResponseObject(validationErrors));
        }

        var securityData = getSecurityData(req.body.v.password);

        database.transaction(function(trx) {
            var dataCache = {};
            return createUser(trx, req, securityData)
                .then(function(user) {
                    dataCache.user = user;
                    if (utils.isSet(address)) {
                        return getStateId(trx, address.state)
                            .then(function(state) {
                                return createAddress(trx, address.street, address.city, state, address.zip);
                            });
                    } else {
                        return null;
                    }
                })
                .then(function(address) {
                    return createBusiness(trx, "Consumer", dataCache.user, business.name, address, business.phone, business.headline);
                })
                .then(function(businessId) {
                    return createDefaultContactGroup(trx, businessId);
                })
                .then(trx.commit)
                .catch(trx.rollback);
        }).then(function() {
            sendVerificationEmail(req.body.v.email);
            res.status(200).send();
        }).catch(function(error) {
            return next(utils.generateResponseObject(error));
        });
    });

    auth.get('/freshToken', passport.authenticate('jwt', {
        session: false
    }), function(req, res, next) {
        var expires = moment().add(7, 'days').valueOf();
        res.status(200).send({
            token: getAuthToken(req.user.id, req.user.email, req.user.verified, req.user.admin, req.user.businessId, req.user.businessType, expires),
            expires: expires
        });
    }); 
        
    auth.get('/verify/resend', passport.authenticate('jwt', {
        session: false
    }), function(req, res, next) {
        if(!req.user.verified) {
            sendVerificationEmail(req.user.email);
            res.status(200).send();
        } else {
            return next(utils.generateResponseObject(new Error("The requesting user is already verified.")));
        }        
    });
    
    router.all('/*', passport.authenticate('jwt', {
        session: false
    }), function(req, res, next) {
        return next();
    });  

    router.post('/*', function(req, res, next) {
        if (!utils.isSet(req.body.v)) {
            var error = new Error("POST parameters must be specified on property 'v' of the request body.");
            error.status = 400;
            return next(utils.generateResponseObject(error));
        }
        return next();
    });
};
