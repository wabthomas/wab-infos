const LOCAL_HTTP = /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/;

/** URL publique rédaction derrière Cloudflare (sous-domaine à un niveau). */
export const CANONICAL_REDACTION_URL = 'https://app.wab-infos.com';

export const REDACTION_PUBLIC_ORIGINS = [
  CANONICAL_REDACTION_URL,
  'https://redaction.app.wab-infos.com',
  'https://redaction.wab-infos.com',
] as const;

function resolvePublicHttpsUrl(raw: string | undefined, fallback: string): string {
  const normalized = (raw?.trim() || fallback).replace(/\/$/, '');
  if (normalized.startsWith('http://') && !LOCAL_HTTP.test(normalized)) {
    return normalized.replace('http://', 'https://');
  }
  return normalized;
}

/** ex. `https://wab-infos.com/redaction` → `/redaction` */
export function redactionBasePathFromPublicUrl(publicUrl: string): string {
  try {
    const pathname = new URL(publicUrl).pathname.replace(/\/$/, '');
    return pathname && pathname !== '/' ? pathname : '';
  } catch {
    return '';
  }
}

export function joinRedactionPublicPath(publicBase: string, pathname: string): string {
  const base = publicBase.replace(/\/$/, '');
  const suffix = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${suffix}`;
}

export function resolveRedactionUrl(raw?: string): string {
  return resolvePublicHttpsUrl(raw, CANONICAL_REDACTION_URL);
}

export function isAllowedRedactionOrigin(origin: string): boolean {
  const normalized = origin.replace(/\/$/, '').toLowerCase();
  if (REDACTION_PUBLIC_ORIGINS.some((item) => item.toLowerCase() === normalized)) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized);
}

export function resolveRedactionLoginUrl(raw?: string): string {
  return joinRedactionPublicPath(resolveRedactionUrl(raw), '/login');
}
