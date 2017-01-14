"use strict";
const AWS = require('aws-sdk');
const fileSystem = require('fs');

module.exports = function(api) {
    
    var utils = api.get('utils');
    
    AWS.config.update({
        accessKeyId: 'AKIAJHLH7KDWSFGUN7OA',
        secretAccessKey: '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',
        region: 'us-east-1'
    });
    var ses = new AWS.SES();
    
    /*
     * Returns the generic e-mail template populated with the given parameters:
     *     - heading : Header of the e-mail
     *     - message : Text content of the e-mail
     *     - items   : Array of items to display in a table; each item is a carat-delimited string
     *                 The first row is of the format: [{ title: value, rows: value, columns: value }] the first item is the column titles
     *                 The next # of rows will be parsed as arrays of length columns, with the first row regarded as headers
     *                 If any row follows, it will be interpreted as another category title row
     *     - action  : Text to put into an action button at the bottom of the e-mail
     *     - link    : Link for the action button to follow
     */
    function generic(heading, message, items, action, link) {
        var genericTemplate = fileSystem.readFileSync('templates/generic.html');
        genericTemplate = utils.replace(genericTemplate, '{{heading}}', heading);
        genericTemplate = utils.replace(genericTemplate, '{{message}}', message);
        
        items = items || [];
        var itemTable = "";
        var rowCounter = 0;
        var columns = 0;
        var headers = false;
        utils.forEach(items, function(row) {
            if(rowCounter == 0) {
                itemTable += "<h3 style='margin: 6px 12px; color:rgb(255,145,0); font-weight: 300; font-size: 18px;'>" + row[0].title + "</h3><table style='padding: 0px 12px 12px 12px; width: 100%; max-width: 600px; text-align: left;'>";
                rowCounter = row[0].rows;
                columns = row[0].columns;
                headers = true;
            } else if(headers) {
                itemTable += "<tr style='font-size:14px; color:#999999;'>";
                for(var i = 0; i < columns; i++) {
                    itemTable += "<th>" + row[i] + "</th>";
                }
                itemTable += "</tr>";
                headers = false;
            } else {
                itemTable += "<tr>";
                for(var i = 0; i < columns; i++) {
                    itemTable += "<td style='padding:3px'>" + row[i] + "</td>";
                }
                itemTable += "</tr>";
                headers = false;
                rowCounter--;
                
                if(rowCounter == 0) {
                    itemTable += "</table>";
                }
            }
        });
        genericTemplate = utils.replace(genericTemplate, '{{items}}', itemTable);
        
        genericTemplate = utils.replace(genericTemplate, '{{action}}', action);
        genericTemplate = utils.replace(genericTemplate, '{{link}}', link);
        
        return genericTemplate;
    }
    
    return {
        ses: {
            connection: ses,
            templates: {
                generic: generic
            }
        }
    };
};