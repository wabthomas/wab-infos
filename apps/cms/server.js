'use strict';

const path = require('path');

// Passenger peut démarrer depuis un autre répertoire
process.chdir(__dirname);
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const strapi = require('@strapi/strapi');

strapi
  .createStrapi({
    distDir: path.join(__dirname, 'dist'),
  })
  .start();
