/** Domaines autorisés dans la WebView Capacitor (voir apps/reader-android/capacitor.config.ts). */
export const CAPACITOR_ALLOW_NAVIGATION = [
  'wab-infos.com',
  '*.wab-infos.com',
  'redaction.app.wab-infos.com',
  'cms.app.wab-infos.com',
  'app.wab-infos.com',
  'wp.wab-infos.com',
] as const;

const LOCAL_HTTP = /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/;

/** Force HTTPS hors dev local (évite cookie Secure + navigateur externe sur l’APK). */
export function resolvePublicHttpsUrl(raw: string | undefined, fallback: string): string {
  const normalized = (raw?.trim() || fallback).replace(/\/$/, '');
  if (normalized.startsWith('http://') && !LOCAL_HTTP.test(normalized)) {
    return normalized.replace('http://', 'https://');
  }
  return normalized;
}

export {
  CANONICAL_REDACTION_URL,
  isAllowedRedactionOrigin,
  joinRedactionPublicPath,
  redactionBasePathFromPublicUrl,
  REDACTION_PUBLIC_ORIGINS,
  resolveRedactionLoginUrl,
  resolveRedactionUrl,
} from './redaction-public-url';

/** Navigation dans la même WebView (ne pas ouvrir Chrome). */
export async function navigateInApp(url: string): Promise<void> {
  if (typeof window === 'undefined') return;
  window.location.assign(resolvePublicHttpsUrl(url, url));
}
