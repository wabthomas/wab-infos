import { createHash, randomBytes } from 'node:crypto';
import { joinRedactionPublicPath } from '@wab-infos/shared';
import { getRedactionPublicUrl } from '@/lib/redaction/config';

/** Origin public rédaction (évite les redirects localhost en prod derrière proxy). */
export function resolveRedactionPublicOrigin(request: Request): string {
  const configured =
    process.env.REDACTION_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_REDACTION_URL?.trim() ||
    '';
  if (configured) return configured.replace(/\/$/, '');

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host')?.trim();
  if (host) {
    const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
    return `${proto}://${host}`.replace(/\/$/, '');
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return getRedactionPublicUrl();
  }
}

export function redactionPublicUrl(request: Request, pathname: string): URL {
  const origin = resolveRedactionPublicOrigin(request).replace(/\/$/, '');
  return new URL(joinRedactionPublicPath(origin, pathname));
}

export const GOOGLE_OAUTH_STATE_COOKIE = 'redaction_google_oauth_state';

export function getGoogleOAuthClientId(): string {
  return (
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    ''
  );
}

export function getGoogleOAuthClientSecret(): string {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || '';
}

/** redirect_uri enregistré dans Google Cloud (doit matcher exactement). */
export function getGoogleOAuthRedirectUri(requestOrigin?: string): string {
  const configured = process.env.REDACTION_GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const base = (
    process.env.NEXT_PUBLIC_REDACTION_URL ||
    process.env.REDACTION_APP_URL ||
    requestOrigin ||
    getRedactionPublicUrl()
  ).replace(/\/$/, '');

  return `${base}/api/redaction/auth/google/oauth-callback`;
}

export function createOAuthState(): string {
  return randomBytes(24).toString('hex');
}

export function hashOAuthState(state: string): string {
  return createHash('sha256').update(state).digest('hex');
}

/** En prod : form_post pour que Google renvoie code/state en POST (évite WAF sur `iss=` en query). */
export function useGoogleOAuthFormPost(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function googleOAuthStateCookieOptions(maxAge = 60 * 10) {
  const formPost = useGoogleOAuthFormPost();
  return {
    httpOnly: true,
    sameSite: formPost ? ('none' as const) : ('lax' as const),
    secure: formPost,
    path: '/',
    maxAge,
  };
}

export function buildGoogleAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', opts.clientId);
  url.searchParams.set('redirect_uri', opts.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('state', opts.state);
  if (useGoogleOAuthFormPost()) {
    url.searchParams.set('response_mode', 'form_post');
  }
  return url.toString();
}

export async function exchangeGoogleAuthorizationCode(opts: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ access_token: string } | { error: string }> {
  const params = new URLSearchParams({
    code: opts.code,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    grant_type: 'authorization_code',
  });
  // Code Android natif (server auth code) : ne pas envoyer redirect_uri (doc Google).
  if (opts.redirectUri.trim()) {
    params.set('redirect_uri', opts.redirectUri.trim());
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokens.access_token) {
    return {
      error: tokens.error_description || tokens.error || 'Échange du code Google impossible',
    };
  }

  return { access_token: tokens.access_token };
}
