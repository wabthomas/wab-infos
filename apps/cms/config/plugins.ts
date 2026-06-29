import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      jwt: {
        expiresIn: '30d',
      },
      ratelimit: {
        max: 5,
        interval: 60000,
      },
    },
  },
  upload: {
    config: {
      sizeLimit: 15 * 1024 * 1024,
      breakpoints: {
        xlarge: 1920,
        large: 1200,
        medium: 800,
        small: 500,
        xsmall: 150,
      },
      sharp: {
        cache: true,
        concurrency: 2,
      },
    },
  },
});

export default config;
