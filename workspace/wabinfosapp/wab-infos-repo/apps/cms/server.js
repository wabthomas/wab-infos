'use strict';

const path = require('path');

// Passenger peut démarrer depuis un autre répertoire
process.chdir(__dirname);
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// PlanetHoster / Passenger
if (process.env.PASSENGER_APP_ENV || process.env.PORT === 'passenger') {
  process.env.HOST = '127.0.0.1';
  process.env.PORT = 'passenger';
}

const strapi = require('@strapi/strapi');

strapi
  .createStrapi({
    distDir: path.join(__dirname, 'dist'),
  })
  .start();
