"use strict";
/*
 *   Validators for the Order table
 */

module.exports = function(utils) {
        
    /*
     *  validTypeTransitions[oldEventType][newEventType][allowedBusinessType] = { 1, undefined };
     *      1 - this business type is allowed
     *      undefined - this business type is not allowed
     */
    const validTypeTransitions = {
        "Create": {
            "Update": {
                "Consumer": 1
            },
            "Cancel": {
                "Consumer": 1
            },
            "Decline": {
                "Producer": 1
            },
            "Approve": {
                "Producer": 1
            },
            "ProducerRequestChange": {
                "Producer": 1
            }
        },
        "Update": {
            "Update": {
                "Consumer": 1
            },
            "Cancel": {
                "Consumer": 1
            },
            "Decline": {
                "Producer": 1
            },
            "Approve": {
                "Producer": 1
            },
            "ProducerRequestChange": {
                "Producer": 1
            }
        },
        "Cancel": {
            // Cancelled orders cannot be revived
        },
        "Decline": {
            // Declined orders cannot be revived
        },
        "Approve": {
            "Cancel": {
                "Consumer": 1,
                "Producer": 1
            },
            "Process": {
                "Producer": 1
            },
            "Deliver": {
                "Producer": 1
            },
            "ProducerRequestChange": {
                "Producer": 1
            },
            "ConsumerRequestChange": {
                "Consumer": 1
            }
        },
        "ProducerRequestChange": {
            "ApproveChangeRequest": {
                "Consumer": 1
            },
            "DeclineChangeRequest": {
                "Consumer": 1
            },
            "CancelChangeRequest": {
                "Producer": 1
            }
        },
        "ConsumerRequestChange": {
            "ApproveChangeRequest": {
                "Producer": 1
            },
            "DeclineChangeRequest": {
                "Producer": 1
            },
            "CancelChangeRequest": {
                "Consumer": 1
            }
        },
        "ApproveChangeRequest": {
            "Cancel": {
                "Consumer": 1,
                "Producer": 1
            },
            "Update": {
                "Consumer": 1
            },
            "Approve": {
                "Producer": 1
            },
            "Process": {
                "Producer": 1
            },
            "Deliver": {
                "Producer": 1
            },
            "ProducerRequestChange": {
                "Producer": 1
            },
            "ConsumerRequestChange": {
                "Consumer": 1
            }
        },
        "DeclineChangeRequest": {
            "Cancel": {
                "Consumer": 1,
                "Producer": 1
            },
            "Update": {
                "Consumer": 1
            },
            "Approve": {
                "Producer": 1
            },
            "Process": {
                "Producer": 1
            },
            "Deliver": {
                "Producer": 1
            },
            "ConsumerRequestChange": {
                "Consumer": 1
            },
            "ProducerRequestChange": {
                "Producer": 1
            }
        },
        "CancelChangeRequest": {
            "Cancel": {
                "Consumer": 1,
                "Producer": 1
            },
            "Update": {
                "Consumer": 1
            },
            "Approve": {
                "Producer": 1
            },
            "Process": {
                "Producer": 1
            },
            "Deliver": {
                "Producer": 1
            },
            "ConsumerRequestChange": {
                "Producer": 1
            },
            "ProducerRequestChange": {
                "Producer": 1
            }
        },
        "Process": {
            "Cancel": {
                "Consumer": 1,
                "Producer": 1
            },
            "Deliver": {
                "Producer": 1,
                "Distributor": 1
            },
            "ConsumerRequestChange": {
                "Consumer": 1
            },
            "ProducerRequestChange": {
                "Producer": 1
            }
        },
        "Deliver": {
            "ProducerRequestChange": {
                "Producer": 1
            },
            "Dispute": {
                "Consumer": 1
            }
        },
        "Dispute": {
            "ResolveDispute": {
                "Producer": 1,
                "Admin": 1
            }
        },
        "ResolveDispute": {
            // When a dispute is resolved, that is the final judgment
        }
    };
    
    /*
     *   Dictionary of history requirements (earlier than 1 step)
     *   historyRequirements[newType][eventInHistory] = <boolean requirement>
     */
    const historyRequirements = {
        "Create": {
            // this is always first
        },
        "Cancel": {
            "Deliver": false
        },
        "Decline": {
            "Approve": false
        },
        "Approve": {
            "Approve": false,
            "Process": false,
            "Deliver": false
        },
        "Process": {
            "Approve": true,
            "Process": false,
            "Deliver": false
        },
        "Deliver": {
            "Approve": true,
            "Process": true,
            "Deliver": false
        },
        "ConsumerRequestChange": {
            "Deliver": false
        },
        "ProducerRequestChange": {
            "Approve": true
        },
        "Update": {
            "Approve": false
        },
        "Dispute": {
            "Deliver": true
        }
    };
    
    /*
     *  Looks back in the order event history for an event of type <type>.
     */
    function orderEventOccurred(type, history) {
        for(var i = 0; i < history.length; i++) {
            if(history[0].type == type) {
                return true;
            }
        }
        return false;
    }
    
    return {       
        /*
         *  Convenience function for checking if a certain event type transition is allowed for the user's business type
         *
         *  oldType - the last event type documented for the order
         *  newType - the event type the user is trying to carry outerHTML
         *  businessType - the business type of the user
         */
        checkOrderEventAuthorized: function(oldType, newType, businessId, businessType, isAdmin, eventHistory) {
            var authorizedBusinesses = validTypeTransitions[oldType][newType];
            
            if(!authorizedBusinesses) { // Is this transition not possible?
                return new Error("An order cannot be updated from from '" + oldType + "' to '" + newType + "'.");
            } else if(authorizedBusinesses[businessType] || (isAdmin && authorizedBusinesses["Admin"])) { // Is this businessType authorized to perform this transition?
                // Passed basic checks, now test for history requirements
                utils.forEach(historyRequirements[newType], function(reqValue, historicalType) {
                    if(orderEventOccurred(historicalType, eventHistory) !== reqValue) {
                        return new Error("An order cannot can be updated to '" + newType + "' if event type '" + historicalType + "' has '" + (reqValue ? "" : "not ") + "happened.");
                    }
                });
                return null;
            } else {
                return new Error("A business of type '" + businessType + "' is not authorized to update an order from '" + oldType + "' to '" + newType + "'.");
            }
        },
        
        orderEventOccurred: orderEventOccurred,
        
        requiredArgs: ["consumer", "product", "quantity"],
        validate: function(args) {
            var errorMessage = null;
            if (!utils.isValidSQLId(args["consumer"])) {
                errorMessage = "Invalid identifier: consumer";
            } else if (utils.isSet(args["distributor"]) && !utils.isValidSQLId(args["distributor"])) {
                console.log("distributor:");
                console.log(args["distributor"]);
                errorMessage = "Invalid identifier: distributor";
            } else if (!utils.isNumeric(args["quantity"])) {
                errorMessage = "The quantity must be numeric.";
            }

            return errorMessage;
        }
    };
};
