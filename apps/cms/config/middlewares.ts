export default [
  'strapi::logger',
  'strapi::errors',
  // Avant les routes Grant : échange ?code= → access_token → rédaction
  'global::google-oauth-code-exchange',
  'global::redirect-google-auth',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'https://wab-infos.com',
        'https://www.wab-infos.com',
        'https://app.wab-infos.com',
        'https://cms.app.wab-infos.com',
        'https://redaction.app.wab-infos.com',
        'https://redaction.wab-infos.com',
      ],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  {
    // Requis pour Grant/OAuth derrière LiteSpeed/Passenger (cookie de session).
    name: 'strapi::session',
    config: {
      key: 'koa.sess',
      maxAge: 86400000,
      httpOnly: true,
      signed: true,
      renew: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      overwrite: true,
    },
  },
  'strapi::favicon',
  'strapi::public',
];
