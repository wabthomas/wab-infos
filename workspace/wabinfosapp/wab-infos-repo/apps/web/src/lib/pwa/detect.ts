import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';
import { PWA_INSTALLED_KEYS, PWA_VARIANT_KEY } from '@/lib/pwa/constants';
import { isStandalonePwa, NATIVE_APP_UA_MARKER } from '@/lib/pwa/launch-splash';

export { isStandalonePwa, NATIVE_APP_UA_MARKER };

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

export type PwaVariant = 'site' | 'redaction';

export function markPwaInstalled(variant: PwaVariant): void {
  try {
    localStorage.setItem(PWA_INSTALLED_KEYS[variant], '1');
  } catch {
    // ignore
  }
}

export function isPwaInstalledLocally(variant: PwaVariant): boolean {
  try {
    return localStorage.getItem(PWA_INSTALLED_KEYS[variant]) === '1';
  } catch {
    return false;
  }
}

type InstalledRelatedApp = { platform: string; url?: string; id?: string };

/** Détecte une PWA déjà installée (Chrome Android, même si l’utilisateur est dans le navigateur). */
export async function detectInstalledPwa(manifestPath = '/manifest.webmanifest'): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;

  const getInstalled = (
    navigator as Navigator & { getInstalledRelatedApps?: () => Promise<InstalledRelatedApp[]> }
  ).getInstalledRelatedApps;
  if (!getInstalled) return false;

  try {
    const apps = await getInstalled.call(navigator);
    if (!apps.length) return false;

    const manifestUrl = new URL(manifestPath, window.location.origin).href;
    return apps.some(
      (app) =>
        app.platform === 'webapp' &&
        typeof app.url === 'string' &&
        (app.url === manifestUrl || app.url.endsWith(manifestPath))
    );
  } catch {
    return false;
  }
}

export function shouldHideInstallBanner(variant: PwaVariant): boolean {
  return (
    isStandalonePwa() ||
    isNativeCapacitorFromUserAgent() ||
    isPwaInstalledLocally(variant)
  );
}

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
