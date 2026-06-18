'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const strapi = require('@strapi/strapi');

strapi.createStrapi({ distDir: './dist' }).start();
