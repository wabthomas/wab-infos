import type { Core } from '@strapi/strapi';

const CATEGORIES = [
  { name: 'Actualités RDC', slug: 'actualites-rdc', color: '#E63946' },
  { name: 'Politique', slug: 'politique', color: '#1D3557' },
  { name: 'Économie', slug: 'economie', color: '#2A9D8F' },
  { name: 'Sécurité', slug: 'securite', color: '#E76F51' },
  { name: 'Société', slug: 'societe', color: '#F4A261' },
  { name: 'Sports', slug: 'sports', color: '#264653' },
  { name: 'International', slug: 'international', color: '#457B9D' },
  { name: 'Technologies', slug: 'technologies', color: '#6C63FF' },
  { name: 'Wab-infos TV', slug: 'wab-infos-tv', color: '#D62828' },
];

async function seedCategories(strapi: Core.Strapi) {
  for (const cat of CATEGORIES) {
    const existing = await strapi.documents('api::category.category').findMany({
      filters: { slug: cat.slug },
    });

    if (!existing.length) {
      await strapi.documents('api::category.category').create({ data: cat });
      strapi.log.info(`Categorie creee : ${cat.name}`);
    }
  }
}

async function verifyReaderPushContentType(strapi: Core.Strapi) {
  try {
    await strapi.documents('api::reader-push-subscription.reader-push-subscription').findFirst();
    strapi.log.info('[push] Content-type reader-push-subscription OK');
  } catch {
    strapi.log.error(
      '[push] Content-type reader-push-subscription introuvable. ' +
        'Sur le serveur : git pull puis rebuild CMS (npm run build:cms ou cms-build.tar.gz).'
    );
  }
}

async function verifyYoutubePushLogContentType(strapi: Core.Strapi) {
  try {
    await strapi.documents('api::youtube-push-log.youtube-push-log').findFirst();
    strapi.log.info('[push] Content-type youtube-push-log OK');
  } catch {
    strapi.log.error(
      '[push] Content-type youtube-push-log introuvable. ' +
        'Rebuild CMS requis pour les alertes vidéo YouTube.'
    );
  }
}

async function seedDemoContent(strapi: Core.Strapi) {
  const existingArticle = await strapi.documents('api::article.article').findFirst();

  if (existingArticle) return;

  const categories = await strapi.documents('api::category.category').findMany();
  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.documentId]));

  let author = (
    await strapi.documents('api::author.author').findMany({
      filters: { slug: 'redaction-wab-infos' },
    })
  )[0];

  if (!author) {
    author = await strapi.documents('api::author.author').create({
      data: {
        name: 'Rédaction Wab-infos',
        slug: 'redaction-wab-infos',
        role: 'Rédaction',
        bio: "La rédaction de Wab-infos, votre source d'information en RDC et dans le monde.",
      },
    });
  }

  const demoArticles = [
    {
      title: 'RDC : le gouvernement annonce de nouvelles mesures économiques',
      slug: 'rdc-gouvernement-mesures-economiques',
      excerpt:
        "Le gouvernement congolais dévoile un plan de relance visant à stimuler l'économie nationale.",
      content:
        "<p>Le gouvernement de la RDC a annoncé un ensemble de mesures économiques pour relancer l'activité et soutenir les secteurs clés.</p><p>Ces décisions couvrent l'agriculture, les mines et les PME.</p>",
      categorySlug: 'economie',
      isFeatured: true,
      isBreaking: true,
      isRecommended: true,
    },
    {
      title: 'Kinshasa : sommet régional sur la sécurité en Afrique centrale',
      slug: 'kinshasa-sommet-securite-afrique-centrale',
      excerpt:
        "Les chefs d'État de la région se réunissent à Kinshasa pour discuter des enjeux sécuritaires.",
      content:
        '<p>Un sommet historique réunit à Kinshasa les dirigeants de la région des Grands Lacs.</p>',
      categorySlug: 'securite',
      isFeatured: true,
      isRecommended: true,
    },
    {
      title: 'Léopards : victoire éclatante en qualifications CAN 2025',
      slug: 'leopards-victoire-qualifications-can-2025',
      excerpt: "L'équipe nationale congolaise s'impose 3-0 et se rapproche de la qualification.",
      content: '<p>Les Léopards du Congo ont livré une performance remarquable.</p>',
      categorySlug: 'sports',
      isFeatured: false,
      isRecommended: false,
    },
  ];

  for (const article of demoArticles) {
    await strapi.documents('api::article.article').create({
      data: {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        status: 'published',
        category: catBySlug[article.categorySlug],
        author: author.documentId,
        isFeatured: article.isFeatured,
        isBreaking: article.isBreaking,
        isRecommended: article.isRecommended,
        readingTime: 3,
        viewCount: Math.floor(Math.random() * 10000),
        seoTitle: article.title.slice(0, 70),
        seoDescription: article.excerpt.slice(0, 160),
      },
      status: 'published',
    });
    strapi.log.info(`Article demo cree : ${article.title}`);
  }
}

// Koa context (typage souple : Strapi Context.query est `{ [key: string]: unknown }`).
type KoaCtx = {
  method: string;
  path: string;
  query: Record<string, unknown>;
  querystring: string;
  redirect: (url: string) => void;
  set: (k: string, v: string) => void;
  type: string;
  body: unknown;
  status: number;
  response: { get: (k: string) => string };
  request?: { headers?: Record<string, string | string[] | undefined> };
};

function readInternalSecret(ctx: KoaCtx): string {
  const raw = ctx.request?.headers?.['x-revalidation-secret'];
  if (Array.isArray(raw)) return raw[0]?.trim() ?? '';
  return typeof raw === 'string' ? raw.trim() : '';
}

function resolveRedactionGoogleCallback() {
  const configured =
    process.env.REDACTION_GOOGLE_CALLBACK_URL?.trim() ||
    `${(
      process.env.REDACTION_APP_URL ||
      process.env.NEXT_PUBLIC_REDACTION_URL ||
      'https://app.wab-infos.com'
    ).replace(/\/$/, '')}/auth/google/callback`;
  return configured.split('?')[0].replace(/\/$/, '');
}

function resolveRedactionLogin() {
  try {
    return new URL('/login', resolveRedactionGoogleCallback()).href;
  } catch {
    return 'https://app.wab-infos.com/login';
  }
}

function resolveCmsGoogleCallbackUri() {
  const base = (process.env.STRAPI_URL || 'https://cms.app.wab-infos.com').replace(/\/$/, '');
  return `${base}/api/connect/google/callback`;
}

function isAllowedFrontCallback(callback: string) {
  try {
    const url = new URL(callback);
    const allowed = new Set([
      'https://app.wab-infos.com',
      'https://redaction.app.wab-infos.com',
      'https://redaction.wab-infos.com',
      'http://localhost:3001',
      'http://localhost:3002',
    ]);
    try {
      allowed.add(new URL(resolveRedactionGoogleCallback()).origin);
    } catch {
      // ignore
    }
    return allowed.has(url.origin) && url.pathname === '/auth/google/callback';
  } catch {
    return false;
  }
}

async function exchangeGoogleCodeAndRedirect(ctx: KoaCtx, strapi: Core.Strapi) {
  const codeRaw = ctx.query.code;
  const code = Array.isArray(codeRaw) ? codeRaw[0] : codeRaw;
  if (!code) return false;

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    ctx.redirect(
      `${resolveRedactionLogin()}?error=${encodeURIComponent('Google OAuth non configuré sur le CMS')}`
    );
    return true;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: resolveCmsGoogleCallbackUri(),
        grant_type: 'authorization_code',
      }),
    });

    const tokens = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenRes.ok || !tokens.access_token) {
      const message =
        tokens.error_description || tokens.error || 'Échange du code Google impossible';
      strapi.log.warn(`[auth] Google token exchange failed: ${message}`);
      ctx.redirect(`${resolveRedactionLogin()}?error=${encodeURIComponent(message)}`);
      return true;
    }

    const target = `${resolveRedactionGoogleCallback()}?access_token=${encodeURIComponent(
      tokens.access_token
    )}`;
    strapi.log.info('[auth] Google code exchanged — redirect to rédaction');
    ctx.redirect(target);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur OAuth Google';
    strapi.log.warn(`[auth] Google token exchange error: ${message}`);
    ctx.redirect(`${resolveRedactionLogin()}?error=${encodeURIComponent(message)}`);
    return true;
  }
}

async function ensurePublicGoogleAuthPermissions(strapi: Core.Strapi) {
  try {
    const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' },
    });
    if (!publicRole) return;

    const actions = [
      'plugin::users-permissions.auth.connect',
      'plugin::users-permissions.auth.callback',
    ];
    for (const action of actions) {
      const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
        where: { action, role: publicRole.id },
      });
      if (!existing) {
        await strapi.db.query('plugin::users-permissions.permission').create({
          data: { action, role: publicRole.id },
        });
        strapi.log.info(`[auth] Permission Public activée : ${action}`);
      }
    }
  } catch (error) {
    strapi.log.warn(
      `[auth] Impossible d'activer les permissions Google Public : ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function configureGoogleAuthProvider(strapi: Core.Strapi) {
  const key = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!key || !secret) {
    strapi.log.info(
      '[auth] Google OAuth non configuré (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET)'
    );
    return;
  }

  const frontendCallback =
    process.env.REDACTION_GOOGLE_CALLBACK_URL?.trim() ||
    `${(
      process.env.NEXT_PUBLIC_REDACTION_URL ||
      process.env.REDACTION_APP_URL ||
      'https://app.wab-infos.com'
    ).replace(/\/$/, '')}/auth/google/callback`;

  try {
    const pluginStore = strapi.store({
      type: 'plugin',
      name: 'users-permissions',
      key: 'grant',
    });
    const prev = ((await pluginStore.get()) as Record<string, unknown> | null) || {};
    const previousGoogle = (prev.google as Record<string, unknown> | undefined) || {};

    await pluginStore.set({
      value: {
        ...prev,
        google: {
          ...previousGoogle,
          enabled: true,
          icon: 'google',
          key,
          secret,
          callback: frontendCallback,
          scope: ['email', 'profile'],
        },
      },
    });

    await ensurePublicGoogleAuthPermissions(strapi);

    const serverUrl =
      (strapi.config.get('server.url') as string | undefined) || process.env.STRAPI_URL || '';
    strapi.log.info(
      `[auth] Provider Google activé (CMS callback : ${serverUrl.replace(/\/$/, '')}/api/connect/google/callback ; front : ${frontendCallback})`
    );
  } catch (error) {
    strapi.log.warn(
      `[auth] Impossible de configurer Google automatiquement : ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.server.routes([
      {
        method: 'GET',
        path: '/auth/google/callback',
        handler: (ctx: KoaCtx) => {
          const base = resolveRedactionGoogleCallback();
          const qs = ctx.querystring ? `?${ctx.querystring}` : '';
          strapi.log.info(`[auth] Redirect Google callback CMS → ${base}`);
          ctx.redirect(`${base}${qs}`);
        },
        config: { auth: false },
      },
      {
        method: 'GET',
        path: '/auth/google/bridge',
        handler: (ctx: KoaCtx) => {
          const fallback = resolveRedactionGoogleCallback();
          const callback = String(ctx.query.callback || fallback).trim() || fallback;
          if (!isAllowedFrontCallback(callback)) {
            ctx.type = 'text/plain';
            ctx.body = 'Callback Google non autorisé';
            return;
          }
          const connectUrl = `/api/connect/google?callback=${encodeURIComponent(callback)}`;
          ctx.set('Cache-Control', 'no-store');
          ctx.type = 'text/html; charset=utf-8';
          ctx.body = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta http-equiv="refresh" content="0;url=${connectUrl}"/>
  <title>Connexion Google…</title>
</head>
<body>
  <p style="font-family:system-ui,sans-serif;text-align:center;margin-top:20vh">
    Redirection vers Google…
  </p>
  <script>location.replace(${JSON.stringify(connectUrl)})</script>
</body>
</html>`;
        },
        config: { auth: false },
      },
      {
        method: 'GET',
        path: '/auth/redaction-profile',
        handler: async (ctx: KoaCtx) => {
          const expected = process.env.REVALIDATION_SECRET?.trim() || '';
          const provided = readInternalSecret(ctx);
          if (!expected || provided !== expected) {
            ctx.status = 403;
            ctx.body = { error: 'Forbidden' };
            return;
          }

          const email = String(ctx.query.email || '')
            .trim()
            .toLowerCase();
          if (!email) {
            ctx.status = 400;
            ctx.body = { error: 'email required' };
            return;
          }

          const adminPanelRoles: string[] = [];
          try {
            const adminUser = await strapi.db.query('admin::user').findOne({
              where: { email },
              populate: ['roles'],
            });
            if (adminUser?.roles) {
              for (const role of adminUser.roles as Array<{ name?: string; code?: string }>) {
                const label = role?.name || role?.code;
                if (label) adminPanelRoles.push(label);
              }
            }
          } catch (error) {
            strapi.log.warn(
              `[auth] redaction-profile admin lookup failed: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }

          let usersPermissionsRole: string | null = null;
          try {
            const upUser = await strapi.db.query('plugin::users-permissions.user').findOne({
              where: { email },
              populate: ['role'],
            });
            usersPermissionsRole = upUser?.role?.name ?? null;
          } catch (error) {
            strapi.log.warn(
              `[auth] redaction-profile users-permissions lookup failed: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }

          ctx.set('Cache-Control', 'no-store');
          ctx.body = { adminPanelRoles, usersPermissionsRole };
        },
        config: { auth: false },
      },
    ]);

    // Contourne Grant si la session koa.sess est perdue au retour Google.
    strapi.server.use(async (ctx: KoaCtx, next: () => Promise<void>) => {
      const path = String(ctx.path || '');
      if (
        ctx.method === 'GET' &&
        path.includes('/connect/google/callback') &&
        (ctx.query.code || ctx.query.error)
      ) {
        if (ctx.query.error) {
          const err = Array.isArray(ctx.query.error) ? ctx.query.error[0] : ctx.query.error;
          ctx.redirect(`${resolveRedactionLogin()}?error=${encodeURIComponent(String(err))}`);
          return;
        }
        const handled = await exchangeGoogleCodeAndRedirect(ctx, strapi);
        if (handled) return;
      }

      await next();

      const location = ctx.response.get('location') || '';
      if (ctx.status >= 300 && ctx.status < 400 && location.includes('error=Grant')) {
        let message = 'Connexion Google impossible';
        try {
          const abs = new URL(location, 'https://cms.app.wab-infos.com');
          message = abs.searchParams.get('error') || message;
        } catch {
          // ignore
        }
        ctx.redirect(`${resolveRedactionLogin()}?error=${encodeURIComponent(message)}`);
      }
    });
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await seedCategories(strapi);
    await seedDemoContent(strapi);
    await verifyReaderPushContentType(strapi);
    await verifyYoutubePushLogContentType(strapi);
    await configureGoogleAuthProvider(strapi);
    strapi.log.info(
      'Wab-infos CMS pret. Activez les permissions Public dans Admin > Settings > Users & Permissions > Roles > Public'
    );
    strapi.log.info(
      'Token API (alertes push lecteurs) : Settings > API Tokens > cocher reader-push-subscription et youtube-push-log (find, create)'
    );
    strapi.log.info(
      'App redaction : Public > Auth > callback (local + google) ; Authenticated > User > me ; creer des Users pour les journalistes'
    );
  },
};
