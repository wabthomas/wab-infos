import type { Core } from '@strapi/strapi';

const REDACTION_GOOGLE_PATH = '/auth/google/callback';

function allowedGoogleCallbackOrigins(env: Core.Config.Shared.ConfigParams['env']): Set<string> {
  const origins = new Set<string>([
    'https://redaction.app.wab-infos.com',
    'http://localhost:3001',
    'http://localhost:3002',
  ]);

  for (const raw of [
    env('REDACTION_GOOGLE_CALLBACK_URL', ''),
    env('REDACTION_APP_URL', ''),
    env('NEXT_PUBLIC_REDACTION_URL', ''),
  ]) {
    const value = String(raw || '').trim();
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      try {
        origins.add(new URL(`https://${value}`).origin);
      } catch {
        // ignore
      }
    }
  }

  return origins;
}

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      // JWT long (évite les tokens ~10–30 min du mode refresh Strapi 5)
      jwtManagement: 'legacy-support',
      jwt: {
        expiresIn: '7d',
      },
      // OAuth + retries : 5/min est trop bas et bloque le flux Google
      ratelimit: {
        max: 30,
        interval: 60000,
      },
      /**
       * Autorise le callback dynamique vers l’app rédaction
       * (par défaut Strapi n’accepte que l’origine exacte du provider.callback en store).
       */
      callback: {
        validate(callback: string) {
          let url: URL;
          try {
            url = new URL(callback);
          } catch {
            throw new Error('The callback is not a valid URL');
          }
          const origins = allowedGoogleCallbackOrigins(env);
          if (!origins.has(url.origin) || url.pathname !== REDACTION_GOOGLE_PATH) {
            throw new Error(
              `Forbidden callback provided: expected origin in redaction app and path ${REDACTION_GOOGLE_PATH}`
            );
          }
        },
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
