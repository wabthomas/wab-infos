export function getStrapiUrl(): string {
  return (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    'http://localhost:8090'
  ).replace(/\/$/, '');
}

export function getRedactionPublicUrl(): string {
  return (
    process.env.NEXT_PUBLIC_REDACTION_URL ||
    process.env.REDACTION_APP_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://app.wab-infos.com' : 'http://localhost:3002')
  ).replace(/\/$/, '');
}

/**
 * Bouton « Continuer avec Google » sur /login.
 * Activé par défaut (OAuth direct rédaction → Google → Strapi JWT).
 * Masquer avec NEXT_PUBLIC_REDACTION_GOOGLE_AUTH=false.
 */
export function isGoogleAuthEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_REDACTION_GOOGLE_AUTH?.trim().toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'off') return false;
  return true;
}

export const REDACTION_COOKIE = 'redaction_jwt';
export const REDACTION_REMEMBER_COOKIE = 'redaction_remember';

/** « Rester connecté » coché à la connexion */
export const REDACTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

/** Session sans « Rester connecté » */
export const REDACTION_COOKIE_MAX_AGE_SESSION = 60 * 60; // 1 heure
