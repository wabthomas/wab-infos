import { createSign } from 'crypto';
import { siteConfig } from '@/config/site';

const INDEXING_SCOPE = 'https://www.googleapis.com/auth/indexing';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PUBLISH_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';

/** Quota soft côté client — l’API Google est ~200 URL/jour pour la plupart des sites. */
const MAX_URLS_PER_BATCH = 40;

export type GoogleIndexingType = 'URL_UPDATED' | 'URL_DELETED';

interface ServiceAccountCreds {
  clientEmail: string;
  privateKey: string;
}

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

let cachedToken: CachedToken | null = null;

function parseServiceAccountJson(raw: string): ServiceAccountCreds | null {
  try {
    const parsed = JSON.parse(raw) as {
      client_email?: string;
      private_key?: string;
    };
    if (!parsed.client_email?.trim() || !parsed.private_key?.trim()) return null;
    return {
      clientEmail: parsed.client_email.trim(),
      privateKey: parsed.private_key.replace(/\\n/g, '\n'),
    };
  } catch {
    return null;
  }
}

export function getGoogleIndexingCredentials(): ServiceAccountCreds | null {
  const json = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    const fromJson = parseServiceAccountJson(json);
    if (fromJson) return fromJson;
  }

  const clientEmail = process.env.GOOGLE_INDEXING_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_INDEXING_PRIVATE_KEY?.trim()?.replace(/\\n/g, '\n');
  if (clientEmail && privateKey) {
    return { clientEmail, privateKey };
  }

  return null;
}

export function isGoogleIndexingConfigured(): boolean {
  return getGoogleIndexingCredentials() != null;
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

async function getAccessToken(creds: ServiceAccountCreds): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs > now + 60_000) {
    return cachedToken.accessToken;
  }

  const iat = Math.floor(now / 1000);
  const header = base64UrlJson({ alg: 'RS256', typ: 'JWT' });
  const claim = base64UrlJson({
    iss: creds.clientEmail,
    scope: INDEXING_SCOPE,
    aud: TOKEN_URL,
    iat,
    exp: iat + 3600,
  });
  const unsigned = `${header}.${claim}`;

  try {
    const signer = createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    const signature = signer.sign(creds.privateKey, 'base64url');
    const assertion = `${unsigned}.${signature}`;

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      cache: 'no-store',
    });

    const data = (await response.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };

    if (!response.ok || !data.access_token) {
      console.warn(
        '[google-indexing] token failed:',
        response.status,
        data.error || data.error_description || ''
      );
      return null;
    }

    const expiresInSec =
      typeof data.expires_in === 'number' && Number.isFinite(data.expires_in)
        ? data.expires_in
        : 3600;
    cachedToken = {
      accessToken: data.access_token,
      expiresAtMs: now + expiresInSec * 1000,
    };
    return data.access_token;
  } catch (err) {
    console.warn('[google-indexing] token error:', err);
    return null;
  }
}

export interface GoogleIndexingResult {
  ok: boolean;
  configured: boolean;
  submitted: number;
  succeeded: number;
  failed: number;
  errors?: string[];
}

async function publishOneUrl(
  accessToken: string,
  url: string,
  type: GoogleIndexingType
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(PUBLISH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, type }),
      cache: 'no-store',
    });

    if (response.ok) {
      return { ok: true };
    }

    const body = await response.text().catch(() => '');
    return {
      ok: false,
      error: `HTTP ${response.status}${body ? `: ${body.slice(0, 160)}` : ''}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'network error',
    };
  }
}

/**
 * Notifie Google Search (Indexing API) — URL_UPDATED par défaut.
 * Best-effort ; nécessite un compte de service propriétaire GSC.
 */
export async function notifyGoogleIndexing(
  urls: string[],
  type: GoogleIndexingType = 'URL_UPDATED'
): Promise<GoogleIndexingResult> {
  const creds = getGoogleIndexingCredentials();
  if (!creds) {
    return { ok: false, configured: false, submitted: 0, succeeded: 0, failed: 0 };
  }

  const urlList = [...new Set(urls.filter(Boolean))].slice(0, MAX_URLS_PER_BATCH);
  if (urlList.length === 0) {
    return { ok: false, configured: true, submitted: 0, succeeded: 0, failed: 0 };
  }

  const accessToken = await getAccessToken(creds);
  if (!accessToken) {
    return {
      ok: false,
      configured: true,
      submitted: urlList.length,
      succeeded: 0,
      failed: urlList.length,
      errors: ['Impossible d’obtenir un access token Google'],
    };
  }

  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  // Séquentiel pour respecter le quota et éviter un burst.
  for (const url of urlList) {
    const result = await publishOneUrl(accessToken, url, type);
    if (result.ok) {
      succeeded += 1;
    } else {
      failed += 1;
      if (result.error && errors.length < 5) {
        errors.push(`${url}: ${result.error}`);
      }
      console.warn('[google-indexing] publish failed:', url, result.error);
    }
  }

  return {
    ok: succeeded > 0,
    configured: true,
    submitted: urlList.length,
    succeeded,
    failed,
    ...(errors.length ? { errors } : {}),
  };
}

/** URL article seule (Google Indexing n’accepte pas les sitemaps). */
export function articleGoogleIndexingUrl(category: string, slug: string): string {
  return `${siteConfig.url}/${category}/${slug}`;
}
