import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '127.0.0.1'),
  port: env.int('PORT', 8090),
  app: {
    keys: env.array('APP_KEYS', ['key1', 'key2', 'key3', 'key4']),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;
