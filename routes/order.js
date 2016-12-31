"use strict";
const express = require('express');
const Promise = require('bluebird');

module.exports = function(api, router, database) {

    var order = express.Router();
    router.use('/order', order);

    var utils = api.get('utils');
    var orderValidator = api.get('validationRetriever')('Order');
    
    function createOrderEvent(trx, order, product) {
        return database.transacting(trx)
        .insert({
            order: order.id,
            type: utils.getOrderEventTypeId("Create"),
            quantity: order.quantity,
            price: product.price
        }, 'id')
        .into('OrderEvent');
    }
    
    function createOrder(trx, order, product) {
        order.distributor = utils.isSet(order.distributor) ? order.distributor : null;
        return database.transacting(trx)
        .insert({
            consumer: order.consumer,
            producer: product.owner,
            distributor: order.distributor,
            product: order.product
        }, 'id')
        .into('Order');
    }
    
    function getProductInfo(trx, order) {
        return database.transacting(trx)
        .forShare()
        .select('owner', 'allowFloatValues', 'price')
        .from('Product')
        .where('id', order.product)
        .then(function(rows) {
            if(rows.length !== 1) {
                var error = new Error('Product not found.');
                error.status = 403;
                throw error;
            } else if(rows[0].allowFloatValues === false && !utils.isInt(order.quantity)) {
                var error = new Error("Quantity specified was float, but float quantities are not allowed on this product.");
                error.status = 403;
                throw error;
            }
            return rows[0];
        });
    }
    
    function createOrderChain(trx, order) {
        var dataCache = {};
        return getProductInfo(trx, order)
        .then(function(product) {
            dataCache.product = product;
            return createOrder(trx, order, product);
        })
        .then(function(orderId) {
            order.id = orderId;
            return createOrderEvent(trx, order, dataCache.product)
        });
    }

    order.post('/create', function(req, res, next) {
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Consumer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }
        
        if(!req.user.verified) { return next(utils.generateResponseObject(utils.userNotVerifiedError)); }

        var paramError = utils.checkParameters(["orders"], req.body.v);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }

        var orders = req.body.v.orders;
        for(var i = 0; i < orders.length; i++) {
            orders[i].consumer = req.user.businessId;
        }
        
        var validationErrors = utils.typeCheckArrayOfType("Order", orders);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }
        
        // Query
        database.transaction(function(trx) {
            return Promise.map(orders, createOrderChain.bind(this, trx))
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function(order) {
            res.status(200).send({ id: order });
        })
        .catch(function (error) {
            return next(utils.generateResponseObject(error));
        });
    });
    
    function getOrder(trx, id) {
        return database.transacting(trx)
        .forUpdate()
        .select('*')
        .from('Order')
        .where('id', id)
        .then(function(rows) {
            if(rows.length !== 1) {
                throw new Error("No order was found matching that id.");
            }
            return rows[0];
        });
    }
    
    function getProductAllowFloatValues(trx, order) {
        return database.transacting(trx)
        .forShare()
        .select('allowFloatValues')
        .from('Product')
        .where('id', order.product)
        .then(function(rows) {
            return rows[0].allowFloatValues;
        });
    }
    
    function getOrderEventHistory(trx, order) {
        return database.transacting(trx)
        .forShare()
        .select('*')
        .from('OrderEvent')
        .where('order', order.id)
        .orderBy('instant', 'desc');
    }
    
    function addOrderEvent(trx, order, type, quantity, price) {
        return database.transacting(trx)
        .insert({
            order: order.id,
            type: utils.getOrderEventTypeId(type),
            quantity: quantity,
            price: price
        })
        .into('OrderEvent');
    }
    
    order.post('/update', function(req, res, next) {
        console.log("Updating order...");
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Consumer", "Producer", "Distributor"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }
        
        var orderEvent = req.body.v;
        var paramError = utils.checkParameters(["order", "eventType", "quantity", "price"], orderEvent);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }
        
        if(!req.user.verified) { return next(utils.generateResponseObject(utils.userNotVerifiedError)); }
        
        var validationErrors = utils.typeCheck("OrderEvent", orderEvent);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }
        
        // Query
        database.transaction(function(trx) {
            var dataCache = {};
            return getOrder(trx, orderEvent.order)
            .then(function(order) {
                dataCache.order = order;
                var business = Number(req.user.businessId);
                
                if(req.user.businessType === "Consumer" && order.consumer != business) {
                    throw new Error("The user is not the consumer linked to this order.");
                } else if(req.user.businessType === "Producer" && order.producer != business) {
                    throw new Error("The user is not the producer linked to this order.");
                } else if(req.user.businessType === "Distributor" && order.distributor != business) {
                    throw new Error("The user is not the distributor linked to this order.");
                }
                
                return getProductAllowFloatValues(trx, order);
            })
            .then(function(allowFloatValues) {
                if(!allowFloatValues && utils.isInt(dataCache.order.quantity)) {
                    throw new Error("The product does not allow ordering in float quantities, but the new quantity is a float value.");
                }
                
                return getOrderEventHistory(trx, dataCache.order);
            })
            .then(function(history) {
                var lastEvent = history[0];
                var lastEventTypeName = utils.getOrderEventTypeName(lastEvent.type);
                var orderEventValidationError = orderValidator.checkOrderEventAuthorized(lastEventTypeName, orderEvent.eventType, req.user.businessId, req.user.businessType, req.user.admin, history);
                console.log("Validated the the order event");
                if(orderEventValidationError) {
                    throw orderEventValidationError;
                }
                
                if(orderEvent.eventType == "Deliver" && !orderValidator.orderEventOccurred("Approve", history)) {
                    return addOrderEvent(trx, dataCache.order, "Approve", lastEvent.quantity, lastEvent.price)
                    .then(function() {
                        return addOrderEvent(trx, dataCache.order, "Deliver", lastEvent.quantity, lastEvent.price);
                    });
                } else if(utils.includes(["Approve", "Process", "Deliver", "Cancel", "Decline", "ApproveChangeRequest", "Dispute"], orderEvent.eventType)) {
                    return addOrderEvent(trx, dataCache.order, orderEvent.eventType, lastEvent.quantity, lastEvent.price);
                } else if(utils.includes(["DeclineChangeRequest", "CancelChangeRequest"], orderEvent.eventType)) {
                    var twoEventsAgo = history[1];
                    return addOrderEvent(trx, dataCache.order, orderEvent.eventType, twoEventsAgo.quantity, twoEventsAgo.price);
                } else if(utils.includes(["ConsumerRequestChange", "ProducerRequestChange", "Update"], orderEvent.eventType)) {
                    return addOrderEvent(trx, dataCache.order, orderEvent.eventType, orderEvent.quantity, lastEvent.price);
                } else {
                    return addOrderEvent(trx, dataCache.order, orderEvent.eventType, orderEvent.quantity, orderEvent.price);
                }
            })
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function() {
            res.status(200).send();
        }).catch(function(error) {
            return next(utils.generateResponseObject(error));
        });
    });
};
