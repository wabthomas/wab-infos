/**
 * Si Grant/OAuth renvoie vers le CMS sur /auth/google/callback (chemin relatif),
 * redirige vers l’app rédaction avec les query params (access_token, etc.).
 */
export default (_config: unknown, { strapi }: { strapi: { log: { info: (m: string) => void } } }) => {
  return async (
    ctx: {
      method: string;
      path: string;
      url: string;
      querystring: string;
      redirect: (url: string) => void;
    },
    next: () => Promise<void>
  ) => {
    const path = (ctx.path || '').split('?')[0];
    // Uniquement le callback « front » (/auth/...), pas l’API Strapi (/api/auth/google/callback → JSON JWT).
    const isGoogleFrontCallback =
      ctx.method === 'GET' &&
      (path === '/auth/google/callback' || path === '/auth/google/callback/');

    if (isGoogleFrontCallback) {
      const configured =
        process.env.REDACTION_GOOGLE_CALLBACK_URL?.trim() ||
        `${(process.env.REDACTION_APP_URL || process.env.NEXT_PUBLIC_REDACTION_URL || 'https://app.wab-infos.com').replace(/\/$/, '')}/auth/google/callback`;
      const base = configured.split('?')[0].replace(/\/$/, '');
      const qs = ctx.querystring ? `?${ctx.querystring}` : '';
      const target = `${base}${qs}`;
      strapi.log.info(`[auth] Redirect Google callback CMS → ${target}`);
      ctx.redirect(target);
      return;
    }

    await next();
  };
};
