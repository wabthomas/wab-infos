export {
  isStandalonePwa as isRedactionStandalone,
  isStandalonePwa,
} from '@/lib/pwa/detect';

import {
  getRedactionServiceWorkerScope,
  getRedactionServiceWorkerUrl,
} from '@/lib/redaction/public-path';

/** @deprecated Préférer getRedactionServiceWorkerUrl() (basePath runtime). */
export function getRedactionSwUrl(): string {
  return getRedactionServiceWorkerUrl();
}

/** @deprecated Préférer getRedactionServiceWorkerScope(). */
export function getRedactionSwScope(): string {
  return getRedactionServiceWorkerScope();
}

export async function registerRedactionServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  const swUrl = getRedactionServiceWorkerUrl();
  const scope = getRedactionServiceWorkerScope();

  try {
    const existing = await navigator.serviceWorker.getRegistration(scope);
    if (existing) return existing;

    return await navigator.serviceWorker.register(swUrl, {
      scope,
    });
  } catch {
    return null;
  }
}
