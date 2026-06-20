export const REDACTION_SW_URL = '/sw-redaction.js';
export const REDACTION_SW_SCOPE = '/redaction/';

export async function registerRedactionServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const existing = await navigator.serviceWorker.getRegistration(REDACTION_SW_SCOPE);
    if (existing) return existing;

    return await navigator.serviceWorker.register(REDACTION_SW_URL, {
      scope: REDACTION_SW_SCOPE,
    });
  } catch {
    return null;
  }
}

export function isRedactionStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
