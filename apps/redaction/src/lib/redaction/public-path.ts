import { redactionBasePathFromPublicUrl } from '@wab-infos/shared';

const PATH_HOSTED_PREFIX = '/redaction';

function normalizeBasePath(base: string): string {
  const trimmed = base.trim().replace(/\/$/, '');
  if (!trimmed || trimmed === '/') return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** Détecte `/redaction` dans l’URL du navigateur (domaine principal + PassengerBaseURI). */
function clientBasePathFromLocation(): string {
  if (typeof window === 'undefined') return '';
  const { pathname } = window.location;
  if (pathname === PATH_HOSTED_PREFIX || pathname.startsWith(`${PATH_HOSTED_PREFIX}/`)) {
    return PATH_HOSTED_PREFIX;
  }
  return '';
}

/**
 * Préfixe des URLs API / SW.
 * - Sous-domaine `redaction.app.*` → pas de préfixe (build sans basePath).
 * - `wab-infos.com/redaction/*` → préfixe `/redaction` au runtime (fetch + SW).
 */
export function getRedactionBasePath(): string {
  const fromBrowser = clientBasePathFromLocation();
  if (fromBrowser) return fromBrowser;

  if (typeof window !== 'undefined') {
    return '';
  }

  const publicUrl =
    process.env.NEXT_PUBLIC_REDACTION_URL?.trim() ||
    process.env.REDACTION_APP_URL?.trim() ||
    '';
  if (publicUrl) {
    return normalizeBasePath(redactionBasePathFromPublicUrl(publicUrl));
  }
  return '';
}

/** Préfixe un chemin absolu (`/api/...`, `/sw-redaction.js`, etc.). */
export function redactionPublicPath(pathname: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const base = getRedactionBasePath();
  if (!base) return path;
  if (path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path}`;
}

export function fetchRedaction(input: string, init?: RequestInit): Promise<Response> {
  return fetch(redactionPublicPath(input), init);
}

export function getRedactionServiceWorkerUrl(): string {
  return redactionPublicPath('/sw-redaction.js');
}

export function getRedactionServiceWorkerScope(): string {
  const base = getRedactionBasePath();
  return base ? `${base}/` : '/';
}
