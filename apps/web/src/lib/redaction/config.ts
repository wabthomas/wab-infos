export function getStrapiUrl(): string {
  return (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    'http://localhost:8090'
  ).replace(/\/$/, '');
}

export const REDACTION_COOKIE = 'redaction_jwt';
export const REDACTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours
export const REDACTION_COOKIE_MAX_AGE_SESSION = 60 * 60 * 8; // 8 h
