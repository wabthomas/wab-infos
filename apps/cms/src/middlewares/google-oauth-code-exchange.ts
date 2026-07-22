/**
 * Contourne Grant quand la session koa.sess est perdue au retour Google
 * (fréquent derrière LiteSpeed / chaînes de redirections).
 * Échange le ?code= contre un access_token puis redirige vers l’app rédaction.
 */
export default () => {
  const resolveRedactionCallback = () => {
    const configured =
      process.env.REDACTION_GOOGLE_CALLBACK_URL?.trim() ||
      `${(
        process.env.REDACTION_APP_URL ||
        process.env.NEXT_PUBLIC_REDACTION_URL ||
        'https://redaction.app.wab-infos.com'
      ).replace(/\/$/, '')}/auth/google/callback`;
    return configured.split('?')[0].replace(/\/$/, '');
  };

  const resolveRedactionLogin = () => {
    try {
      return new URL('/login', resolveRedactionCallback()).href;
    } catch {
      return 'https://redaction.app.wab-infos.com/login';
    }
  };

  const resolveCmsCallbackUri = () => {
    const base = (process.env.STRAPI_URL || 'https://cms.app.wab-infos.com').replace(/\/$/, '');
    return `${base}/api/connect/google/callback`;
  };

  return async (
    ctx: {
      method: string;
      path: string;
      query: Record<string, string | string[] | undefined>;
      redirect: (url: string) => void;
      throw: (status: number, message?: string) => void;
    },
    next: () => Promise<void>
  ) => {
    const path = String(ctx.path || '');
    const codeRaw = ctx.query.code;
    const code = Array.isArray(codeRaw) ? codeRaw[0] : codeRaw;

    if (ctx.method !== 'GET' || !path.includes('/connect/google/callback') || !code) {
      await next();
      return;
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      ctx.redirect(
        `${resolveRedactionLogin()}?error=${encodeURIComponent('Google OAuth non configuré sur le CMS')}`
      );
      return;
    }

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: resolveCmsCallbackUri(),
          grant_type: 'authorization_code',
        }),
      });

      const tokens = (await tokenRes.json()) as {
        access_token?: string;
        id_token?: string;
        error?: string;
        error_description?: string;
      };

      if (!tokenRes.ok || !tokens.access_token) {
        const message =
          tokens.error_description || tokens.error || 'Échange du code Google impossible';
        ctx.redirect(`${resolveRedactionLogin()}?error=${encodeURIComponent(message)}`);
        return;
      }

      const target = `${resolveRedactionCallback()}?access_token=${encodeURIComponent(tokens.access_token)}`;
      ctx.redirect(target);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur OAuth Google';
      ctx.redirect(`${resolveRedactionLogin()}?error=${encodeURIComponent(message)}`);
    }
  };
};
