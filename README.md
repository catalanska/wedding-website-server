# Wedding Website Server

## Description

This project was developed using **NodeJS** for the server, **MongoDB** as database and **npm** as package manager.

It handles the communication with Instagram's API to provide it to the [client side](https://github.com/catalanska/wedding-website-client) upon request.

It also connects to a mongo database to cache photos data and limit hits to external APIs.

## Installation guide

To run it locally:

- Make sure you have Node ([help]( https://nodejs.org/es/download/)) and MongoDB ([help](https://docs.mongodb.com/manual/administration/install-community/)) installed in your system.
- Rename lib/config-demo.js to lib/config.js and replace values with your own ones
- Run: `npm install` (this will install all the needed dependencies)
- To start the project run: `npm start` (This will start a server on localhost:3002)
