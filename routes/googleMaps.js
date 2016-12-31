'use strict';

/*
 *  Lodash Injection
 */
const _ = require('lodash');

/*
 *  Promise Injection
 */
const Promise = require('bluebird');

/*
 *  Express Injection
 */
const express = require('express');

/*
 *  Google Maps Client Options
 *
 *  var options = {
 *    ^key: '', // API Key
 *    clientId: 'Work Client Id',
 *    clientSecret: 'Work Client Private Key',
 *    channel: 'Work Channel',
 *    timeout: 1000, // Default is 60,000 milliseconds
 *    rate: {
 *        limit: 10, // Requests per period
 *        period: 1000, // Default is 1000ms
 *    },
 *    retryOptions: {
 *        interval: 500, // How long to wait before retrying a failed request
 *    },
 *    Promise: PromiseConstructor
 *  }
 */
var options = {
    key: 'AIzaSyDhA-jJMXZoKCmfQybl1MZUE1wHCPsuQVY',
    Promise: Promise
}

/*
 *  Initialize Google Maps Client
 */
const GMClient = require('@google/maps').createClient(options);

/*
 *  Module Export
 */
module.exports = function(api, router, database) {
    var utils = api.get('utils');
    var maps = express.Router();
    router.use('/maps', maps);


    maps.post('/geocode', function(req, res, next) {
        return GMClient.geocode(req.body.v).asPromise().then(function(response) {
            return response.json.results;
        }).then(function(response) {
            res.status(200).send(response);
        }).catch(function(error) {
            return next(utils.generateResponseObject(error));
        });
    });

    maps.post('/reverseGeocode', function(req, res, next) {
        return GMClient.reverseGeocode(req.body.v).asPromise().then(function(response) {
            return response.json.results;
        }).then(function(response) {
            res.status(200).send(response);
        }).catch(function(error) {
            return next(utils.generateResponseObject(error));
        });
    });

}

/*
 *  Latitude and Longitude Object
 *
 *  LatLng = {
 *    lat: #######,
 *    lng: #######
 *  }
 */

/*
 *  Bounds = {
 *    south: Bottom-Left Latitude
 *    west: Bottom-Left Longitude
 *    north: Top-Right Latitude
 *    east: Top-Right Longitude
 *  }
 */

/*
 *  Geocode
 *    https://developers.google.com/maps/documentation/geocoding/intro
 *    Used to turn an address into Latitude and Longitude
 *
 *    geocode(query, ResponseHandler)
 *
 *  query = {
 *    ^address: '4609 Bancroft St, Pittsburgh, PA',
 *    components: 'Unlikely to be utilized', //https://developers.google.com/maps/documentation/geocoding/intro#ComponentFiltering
 *    bounds: {  // Used to create a 'local' box to narrow the search within
 *      south: ##.####,
 *      west: ##.####,
 *      north: ##.####,
 *      east: ##.####
 *    },
 *    region: 'gb', 'de', 'fr', etc., // Necessary when providing non-US Directions
 *    language: 'en', 'fr', 'de', etc., // Necessary when providing non-US Directions
 */

/*
 *  Reverse Geocode
 *    https://developers.google.com/maps/documentation/geocoding/intro#ReverseGeocoding
 *    Used to translate a location on a map to a human-readable address
 *
 *    reverseGeocode(query, ResponseHandler)
 *
 *  query = {
 *    ^latlng: LatLng,
 *      ** OR
 *    ^placeId: 'placeId_string',
 *    result_type: [  'street_address', // Other Types: https://developers.google.com/maps/documentation/geocoding/intro#Types
 *                    'route',
 *                    'intersection',
 *                    'political',
 *                    'country',
 *                    'administrative_area_level_1', // US States
 *                    'administrative_area_level_2', // US Counties
 *                    'colloquial_area', // Commonly-used alternative name
 *                    'locality', // US City or Town
 *                    'neighborhood',
 *                    'postal_code', // Zip Code
 *                 ],
 *    location_type: 'ROOFTOP', 'RANGE_INTERPOLATED', 'GEOMETRIC_CENTER', 'APPROXIMATE',
 *        ** If result_type and location_type are both specified only results that match both are returned
 *    language: 'en', 'fr', 'de', etc., // Necessary when providing non-US Directions
 *
 *    Ex: Latitude and Longitute referencing 4609 Bancroft St, Pittsburgh PA
 *
 */

/*
 *  Directions
 *    https://developers.google.com/maps/documentation/directions/intro
 *    Used to provide directions from Starting Point to End Point with waypoints in-between
 *
 *    directions(query, ResponseHandler)
 *
 *  query = {
 *    ^origin: LatLng,
 *    ^destination: LatLng,
 *    mode: 'driving', 'walking', 'bicycling', 'transit',
 *    waypoints: [LatLng],
 *    alternatives: BOOLEAN, // Potentially provides more than one route to the destination
 *    avoid: ['tolls', 'highways', 'ferries', 'indoor'],
 *    language: 'en', 'fr', 'de', etc.,
 *    units: 'metric', 'imperial',
 *    region: 'gb', 'de', 'fr', etc., // Necessary when providing non-US Directions
 *    departure_time: TIMESTAMP, // Integer in seconds since midnight, January 1, 1970 UTC
 *    traffic_model: 'best_guess', // Note necessary to specify as defaults to best_guess
 *    transit_mode: ['bus', 'subway', 'train', 'tram', 'rail'], // Only used if MODE = transit
 *    transit_routing_preference: 'less_walking', 'fewer_transfers', // Only used if MODE = transit
 *    optimize: BOOLEAN, // API will automagically re-order waypoints to optimize the route
 *    retryOptions: retryOptions,
 *    timeout: retryOptions
 *  }
 *
 *    Ex. Bicycling directions from 4609 Bancroft St PGH to Cathedral of Learning PGH
 *
 */
/*
GMClient.directions({
    origin: {
        lat: 40.470626,
        lng: -79.955237
    },
    destination: {
        lat: 40.444349,
        lng: -79.953377
    },
    mode: 'bicycling',
    alternatives: false,
    units: 'imperial'
}).asPromise().then(function(response) {
    console.log(response);
    return response;
}).catch(function(error) {
    return error;
});


/*
 *  Distance Matrix
 *    https://developers.google.com/maps/documentation/distance-matrix/intro
 *    Used to get distance and travel time information from Starting Point to End Point with waypoints
 *
 *    distanceMatrix(query, ResponseHandler)
 *
 *  query = {
 *    ^origins: [LatLng],
 *    ^destinations: [LatLng],
 *    mode: 'driving', 'walking', 'bicycling', 'transit',
 *    language: 'en', 'fr', 'de', etc., // Necessary when providing non-US Directions
 *    avoid: ['tolls', 'highways', 'ferries', 'indoor'],
 *    units: 'metric', 'imperial',
 *      ** Either Departure Time OR Arrival Time can be specified, not both **
 *    arrival_time: TIMESTAMP, // Integer in seconds since midnight, January 1, 1970 UTC
 *    departure_time: TIMESTAMP, // Integer in seconds since midnight, January 1, 1970 UTC
 *      ** **
 *    traffic_model: 'best_guess', // Note necessary to specify as defaults to best_guess
 *    transit_mode: ['bus', 'subway', 'train', 'tram', 'rail'], // Only used if MODE = transit
 *    transit_routing_preference: 'less_walking', 'fewer_transfers', // Only used if MODE = transit
 *
 *    Ex: Origins at 4609 Bancroft St and Cathedral of Learning
 *        Destination at Tipsy Cow Burger Bar
 *        Leaving now
 */
/*
GMClient.distanceMatrix({
    origins: [{
        lat: 40.470626,
        lng: -79.955237
    }, {
        lat: 40.444349,
        lng: -79.953377
    }],
    destinations: {
        lat: 40.455641,
        lng: -79.931284
    },
    mode: 'bicycling',
    units: 'imperial',
    departure_time: Date.now()
}).asPromise().then(function(response) {
    return response;
}).catch(function(error) {
    return error;
});


/*
 */
