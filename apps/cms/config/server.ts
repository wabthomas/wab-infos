import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '127.0.0.1'),
  port: env.int('PORT', 8090),
  url: env('STRAPI_URL'),
  // Strapi 5 : boolean `proxy: true` ne suffit plus — Grant/OAuth a besoin de koa.proxy
  // pour les sessions derrière Nginx/Passenger (sinon /api/connect/* → 500).
  proxy: {
    koa: env.bool('SERVER_PROXY', env('NODE_ENV') === 'production'),
  },
  app: {
    keys: env.array('APP_KEYS', ['key1', 'key2', 'key3', 'key4']),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;
