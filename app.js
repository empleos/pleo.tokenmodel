/**
 * Module dependencies.
 */

global.express = require('express');

global.app = express();
global.router = express.Router();

global.BASE_PATH = __dirname;

// default enviornment.
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

app.get('/', (req, res) => res.status(200).send('Service is running'));
