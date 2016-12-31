"use strict";
const express = require('express');
const Promise = require('bluebird');

module.exports = function(api, router, database) {

    var product = express.Router();
    var utils = api.get('utils');
    var productValidator = api.get('validationRetriever')('Product');
    router.use('/product', product);

    function createCategory(trx, owner, name) {
        return database.transacting(trx)
        .insert({
            owner: owner,
            name: name
        }, 'id')
        .into('ProductCategory')
		.then(function(categoryIds) {
			return categoryIds[0];
		});
    }

    product.post('/category', function(req, res, next) {
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Producer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }

        var category = req.body.v;
        category.owner = req.user.businessId;
        var paramError = utils.checkParameters(["name", "owner"], category);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }

        var validationErrors = utils.typeCheck("ProductCategory", category);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }

        // Query
        database.transaction(function(trx) {
            return createCategory(trx, category.owner, category.name)
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function(category) {
            res.status(200).send({ id: category });
        })
        .catch(function(error) {
            return next(utils.generateResponseObject(error));
        });
    });
	
	function updateCategory(trx, id, owner, name) {
		return database.transacting(trx)
		.update('name', name)
		.into('ProductCategory')
		.where({
			id: id,
			owner: owner
		});
	}
	
	product.put('/category', function(req, res, next) {
		// Validation
        var businessTypeError = utils.checkBusinessTypes(["Producer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }

        var category = req.body.v;
        var paramError = utils.checkParameters(["id", "name"], category);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }

        var validationErrors = utils.typeCheck("ProductCategory", category);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }

        // Query
        database.transaction(function(trx) {
            return updateCategory(trx, category.id, req.user.businessId, category.name)
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function(category) {
            res.status(200).send();
        })
        .catch(function(error) {
            return next(utils.generateResponseObject(error));
        });
	});
	
	function deleteCategory(trx, id, owner) {
		return getProducts(trx, owner, id)
		.then(function(products) {
			return Promise.map(products, function(product) {
				return deleteProduct(trx, product.id, owner);
			});
		})
		.then(function() {
			return database.transacting(trx)
			.update({
				'deleted': true
			})
			.into('ProductCategory')
			.where({
				'id': id,
				'owner': owner
			});
		});
	}
	
	product.delete('/category/:id', function(req, res, next) {
		// Validation
        var businessTypeError = utils.checkBusinessTypes(["Producer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }

        var category = { id: req.params.id };
        var paramError = utils.checkParameters(["id"], category);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }

        var validationErrors = utils.typeCheck("DeleteRequest", category);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }

        // Query
        database.transaction(function(trx) {
            return deleteCategory(trx, category.id, req.user.businessId)
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

    function getCategories(trx, owner) {
        return database.transacting(trx)
        .forShare()
        .select('*')
        .from('ProductCategory')
        .where({
			'owner': owner,
			'deleted': false
		});
    }

	// category is optional
    function getProducts(trx, owner, category) {
		var filter = {
			'owner': owner,
			'deleted': false
		};
		if(utils.isSet(category)) {
			filter.category = category;
		}
        return database.transacting(trx)
        .forShare()
        .select('*')
        .from('Product')
        .where(filter);
    }

    product.get('/business/:id', function(req, res, next) {
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
        database.transaction(function(trx) {
            var data = {};
            return getCategories(trx, businessId)
            .then(function(categories) {
                data.categories = categories;
                return getProducts(trx, businessId);
            })
            .then(function(products) {
				utils.convertArrayFromDatabaseOfType("Product", products);
                data.products = products;
                return data;
            })
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function(data) {
            res.status(200).send(data);
        })
        .catch(function(error) {
            return next(utils.generateResponseObject(error));
        });
    });

    function addProduct(trx, owner, category, name, available, quantityAvailable, description, price, unit, allowFloatValues) {
        return database.transacting(trx)
        .insert({
            owner: owner,
            category: category,
            name: name,
            available: available,
            quantityAvailable: quantityAvailable,
            description: description,
            price: price,
            unit: unit,
            allowFloatValues: allowFloatValues
        }, 'id')
        .into('Product')
		.then(function(productIds) {
			return productIds[0];
		});
    }

    product.post('', function(req, res, next) {
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Producer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }

        var product = req.body.v;
        product.owner = req.user.businessId;
        var paramError = utils.checkParameters(productValidator.requiredArgs, product);
        if(paramError) { return next(utils.generateResponseObject(paramError)) };

        var validationErrors = utils.typeCheck("Product", product);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }

        // Query
        database.transaction(function(trx) {
            return addProduct(trx, product.owner, product.category, product.name, product.available, product.quantityAvailable, product.description, product.price, product.unit, product.allowFloatValues)
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function(product) {
            res.status(200).send({ id: product });
        })
        .catch(function(error) {
            return next(utils.generateResponseObject(error));
        });
    });
	
	function updateProduct(trx, id, owner, category, name, available, quantityAvailable, description, price, unit, allowFloatValues) {
		return database.transacting(trx)
		.update({
			name: name,
			category: category,
			available: available,
			quantityAvailable: quantityAvailable,
			description: description,
			price: price,
			unit: unit,
			allowFloatValues: allowFloatValues
		})
		.into('Product')
		.where({
			id: id,
			owner: owner
		});
	}

    product.put('', function(req, res, next) {
        // Validation
        var businessTypeError = utils.checkBusinessTypes(["Producer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }

		var product = req.body.v;
        product.owner = req.user.businessId;
        var paramError = utils.checkParameters(["id"].concat(productValidator.requiredArgs), product);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }

        var validationErrors = utils.typeCheck("Product", product);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }

        // Query
        database.transaction(function(trx) {
            return updateProduct(trx, product.id, product.owner, product.category, product.name, product.available, product.quantityAvailable, product.description, product.price, product.unit, product.allowFloatValues)
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
	
	// Delete if no orders, soft-delete if orders
	function deleteProduct(trx, id, owner) {
		return database.transacting(trx)
		.forUpdate()
		.select('id')
		.from('Order')
		.where('product', id)
		.then(function(rows) {
			if(rows.length > 0) {
				return database.transacting(trx)
				.update({
					deleted: true
				})
				.into('Product')
				.where('id', id);
			} else {
				return database.transacting(trx)
				.del()
				.into('Product')
				.where('id', id);
			}
		});
	}
	
	product.delete('/:id', function(req, res, next) {
		// Validation
        var businessTypeError = utils.checkBusinessTypes(["Producer"], req.user);
        if(businessTypeError) { return next(utils.generateResponseObject(businessTypeError)); }

        var product = { id: req.params.id };
        var paramError = utils.checkParameters(["id"], product);
        if(paramError) { return next(utils.generateResponseObject(paramError)); }

        var validationErrors = utils.typeCheck("DeleteRequest", product);
        if(validationErrors.length > 0) { return next(utils.generateResponseObject(validationErrors)); }

        // Query
        database.transaction(function(trx) {
            return deleteProduct(trx, product.id, req.user.businessId)
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
