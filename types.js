"use strict";

module.exports = function(api) {
    var utils = null;
    
    return {
        "Address": {
            type: "object",
            definition: {
                lineOne: {
                    type: "string",
                    required: true,
                    minLength: 5,
                    maxLength: 128
                },
                lineTwo: {
                    type: "string",
                    required: true,
                    minLength: 5,
                    maxLength: 128
                },
                zip: {
                    type: "zip",
                    required: true
                },
                state: {
                    type: "string",
                    required: true,
                    minLength: 2
                }
            },
            required: true,
            customValidation: function(name, value) {
                return [];
            }
        },
        "Broadcast": {
            type: "object",
            definition: {
                "recipients": {
                    type: "array",
                    arrType: "BroadcastRecipientContact",
                    required: true,
                    minLength: 1
                }
            },
            required: true,
            customValidation: function(name, value) {
                return [];
            }
        },
        "BroadcastRecipientContact": {
            type: "object",
            definition: {
                "id": {
                    type: "sqlid",
                    required: true
                }
            }
        },
        "Business": {
            type: "object",
            definition: {
                "name": {
                    type: "string",
                    required: true,
                    minlength: 1,
                    maxlength: 128
                },
                "address": {
                    type: "Address"
                },
                "phone": {
                    type: "phone"
                },
                "headline": {
                    type: "string",
                    maxlength: 255
                },
                "bio": {
                    type: "string",
                    maxlength: 65535
                },
                "orderInstructions": {
                    type: "string",
                    maxlength: 65535
                }
            },
            required: true,
            customValidation: function(name, value) {
                return [];
            }
        },
        "Contact": {
            type: "object",
            definition: {
                "name": {
                    type: "string",
                    required: true,
                    minLength: 1,
                    maxLength: 128
                },
                "email": {
                    type: "email",
                    minLength: 5,
                    maxLength: 256                    
                }
            },
            required: true,
            customValidation: function(name, value) {
                return [];
            }
        },
        "ContactGroup": {
            type: "object",
            definition: {
                "name": {
                    type: "string",
                    minLength: 1,
                    maxLength: 45
                }
            },
            required: true,
            customValidation: function(name, value) {
                return [];
            }
        },
        "ContactGroupMember": {
            type: "object",
            definition: {
                "contactMember": {
                    type: "sqlid",
                    required: true
                },
                "group": {
                    type: "sqlid",
                    required: true
                }
            },
            required: true,
            customValidation: function(name, value) {
                return [];
            }
        },
        "Conversation": {
            type: "object",
            definition: {
                "businesses": {
                    type: "array",
                    arrType: "sqlid",
                    required: true,
                    minLength: 1
                }
            },
            required: true,
            customValidation: function(name, value) {
                return [];
            }
        },
        "ConversationListRequest": {
            type: "object",
            definition: {
                "startIndex": {
                    type: "int",
                    unsigned: true,
                    required: false
                },
                "amount": {
                    type: "int",
                    positive: true,
                    required: false
                }
            },
            required: true,
            customValidation: function(name, value) {
                return [];
            }
        },
        "ConversationMember": {
            type: "object",
            definition: {
                "conversation": {
                    type: "sqlid",
                    required: true
                },
                "member": {
                    type: "sqlid",
                    required: true
                }
            },
            customValidation: function(name, value) {
                return [];
            }
        },
		"DeleteRequest": {
			type: "object",
			definition: {
				"id": {
					type: "sqlid",
					required: true
				}
			},
			required: true,
			customValidation: function(name, value) {
				return [];
			}
		},
        "EmailValidationRequest": {
            type: "object",
            definition: {
                "email": {
                    type: "email",
                    required: true
                }
            },
            required: true,
            customValidation: function(name, value) {
                return [];
            }
        },
        "Message": {
            type: "object",
            definition: {
                "conversation": {
                    type: "sqlid",
                    required: true
                },
                "content": {
                    type: "string",
                    required: true,
                    minLength: 1,
                    maxLength: 1000
                }
            },
            required: true,
            customValidation: function(name, value) {
                return [];
            }
        },
        "Order": {
            type: "object",
            definition: {
                "consumer": {
                    type: "sqlid",
                    required: true
                },
                "distributor": {
                    type: "sqlid"
                },
                "product": {
                    type: "sqlid",
                    required: true
                },
                "quantity": {
                    type: "float",
                    positive: true,
                    required: true
                }
            },
            required: true,
            customValidation: function(name, value) {
                return [];
            }
        },
        "OrderEvent": {
            type: "object",
            definition: {
                "order": {
                    type: "sqlid",
                    required: true
                },
                "eventType": {
                    type: "orderEvent",
                    required: true
                },
                "quantity": {
                    type: "float",
                    positive: true,
                    required: true
                },
                "price": {
                    type: "float",
                    positive: true
                }
            },
            required: true,
            customValidation: function(name, value) {
                return [];
            }
        },
        "Product": {
            type: "object",
            definition: {
                "category": {
                    type: "sqlid",
                    required: true
                },
                "name": {
                    type: "string",
                    minLength: 1,
                    maxLength: 45,
                    required: true
                },
                "available": {
                    type: "bool",
                    required: true
                },
                "quantityAvailable": {
                    type: "float",
                    unsigned: true,
                    required: true
                },
                "description": {
                    type: "string",
                    required: true,
                    minLength: 0,
                    maxLength: 255
                },
                "price": {
                    type: "float",
                    positive: true,
                    required: true
                },
                "unit": {
                    type: "string",
                    required: true,
                    minLength: 1,
                    maxLength: 45
                },
                "allowFloatValues": {
                    type: "bool",
                    required: true
                },
                "infinite": {
                    type: "bool",
                    required: true
                }
            },
            required: true,
            customValidation: function(name, value) {
                utils = utils || api.get("utils");
                var errors = [];
                if(utils.isFalse(value.allowFloatValues) && !utils.isInt(value.quantityAvailable)) {
                    errors.push(new Error("Product quantity '" + name + ".quantity is a float value, but float values are not allowed on this product."));
                }
                return errors;
            }
        },
        "ProductCategory": {
            type: "object",
            definition: {
				"id": {
					type: "sqlid"
				},
                "name": {
                    type: "string",
					required: true,
                    minLength: 1,
                    maxLength: 45
                }
            },
            required: true,
            customValidation: function(name, value) {
                return [];
            }
        },
        "User": {
            type: "object",
            definition: {
                "id": {
                    type: "sqlid"
                },
                "email": {
                    type: "email",
                    required: true,
                    minLength: 5,
                    maxLength: 256
                },
                "password": {
                    type: "password",
                    required: true,
                    minLength: 8,
                    maxLength: 32
                },
                "firstName": {
                    type: "string",
                    minLength: 1,
                    maxLength: 45,
                    required: true
                },
                "lastName": {
                    type: "string",
                    minLength: 1,
                    maxLength: 45,
                    required: true
                }
            },
            required: true,
            customValidation: function(name, value) {
                return [];
            }
        },
        "UserVerification": {
            type: "object",
            definition: {
                "email": {
                    type: "email",
                    required: true
                },
                "verificationCode": {
                    type: "string",
                    required: true
                }
            },
            required:true,
            customValidation: function(name, value) {
                return [];
            }
        }
    };
};