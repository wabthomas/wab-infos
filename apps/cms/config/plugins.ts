import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      jwt: {
        expiresIn: '7d',
      },
      ratelimit: {
        max: 5,
        interval: 60000,
      },
    },
  },
});

export default config;
