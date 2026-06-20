import { mergeConfig, type UserConfig } from 'vite';

/** Monorepo : deps hoisted (ex. `ai` de Next.js) hors du panel admin Strapi. */
export default (config: UserConfig) =>
  mergeConfig(config, {
    build: {
      rollupOptions: {
        external: ['ai', '@opentelemetry/api'],
      },
    },
    optimizeDeps: {
      exclude: ['ai'],
    },
  });
