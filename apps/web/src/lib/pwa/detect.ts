import { PWA_VARIANT_KEY } from '@/lib/pwa/constants';

export type PwaVariant = 'site' | 'redaction';

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function isIosSafari(): boolean {
  if (!isIosDevice()) return false;
  const ua = navigator.userAgent;
  return /safari/i.test(ua) && !/crios|fxios|edgios|opios|mercury/i.test(ua);
}

export function needsSafariForIosInstall(): boolean {
  if (!isIosDevice()) return false;
  if (isIosSafari()) return false;
  const ua = navigator.userAgent;
  return /crios|fxios|edgios|FBAN|FBAV|Instagram|Line\//i.test(ua) || !/safari/i.test(ua);
}

export { isStandalonePwa, NATIVE_APP_UA_MARKER } from '@/lib/pwa/launch-splash';

export function inferPwaVariantFromPath(pathname: string): PwaVariant {
  if (pathname === '/redaction/login' || pathname.startsWith('/redaction/login')) {
    return 'redaction';
  }
  return 'site';
}

export function getPwaVariant(): PwaVariant {
  if (typeof window === 'undefined') return 'site';
  try {
    const stored = localStorage.getItem(PWA_VARIANT_KEY);
    if (stored === 'redaction' || stored === 'site') return stored;
  } catch {
    // ignore
  }
  return inferPwaVariantFromPath(window.location.pathname);
}

export function persistPwaVariant(variant: PwaVariant): void {
  try {
    localStorage.setItem(PWA_VARIANT_KEY, variant);
  } catch {
    // ignore
  }
}

/**
 * Mémorise la variante PWA selon la page d’installation.
 * « Rédaction » si installé depuis /redaction/login ; sinon Wab-infos.
 * Ne remplace pas « redaction » quand l’utilisateur navigue ensuite sur le site.
 */
export function persistPwaVariantFromPath(pathname: string): void {
  if (inferPwaVariantFromPath(pathname) === 'redaction') {
    persistPwaVariant('redaction');
    return;
  }

  try {
    const stored = localStorage.getItem(PWA_VARIANT_KEY);
    if (stored === 'redaction') return;
  } catch {
    // ignore
  }

  persistPwaVariant('site');
}
