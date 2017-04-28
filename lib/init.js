var config = require('./config');
var ig = require('instagram-node').instagram();

// Setup Instagram Client
ig.use({ client_id: config.instagramClientId, client_secret: config.instagramClientSecret });

// Setup Server
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.json()); // for parsing application/json

var server = app.listen(3002, function () {
    var host = server.address().address;
    var port = server.address().port;
});



exports.igClient = ig;
exports.server = server;
exports.express = express;
exports.app = app;
