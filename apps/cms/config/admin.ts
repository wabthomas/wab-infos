import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'change-me-admin-jwt-secret'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'change-me-api-token-salt'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'change-me-transfer-token-salt'),
    },
  },
  flags: {
    nps: false,
    promoteEE: false,
  },
});

export default config;
