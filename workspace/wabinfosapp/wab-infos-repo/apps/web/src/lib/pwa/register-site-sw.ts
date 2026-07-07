import { SITE_SW_SCOPE, SITE_SW_URL } from '@/lib/pwa/constants';

export async function registerSiteServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const existing = await navigator.serviceWorker.getRegistration(SITE_SW_SCOPE);
    if (existing) return existing;

    return await navigator.serviceWorker.register(SITE_SW_URL, {
      scope: SITE_SW_SCOPE,
    });
  } catch {
    return null;
  }
}
