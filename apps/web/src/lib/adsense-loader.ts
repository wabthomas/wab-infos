const ADSENSE_SCRIPT_EVENT = 'wab-adsense-script-loaded';

export function markAdsenseScriptLoaded(): void {
  if (typeof window === 'undefined') return;
  window.__wabAdsenseScriptLoaded = true;
  const script = document.getElementById('adsense-script');
  script?.setAttribute('data-loaded', 'true');
  window.dispatchEvent(new Event(ADSENSE_SCRIPT_EVENT));
}

export function isAdsenseScriptLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.__wabAdsenseScriptLoaded);
}

export function waitForAdsenseScript(timeoutMs = 12_000): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (isAdsenseScriptLoaded()) return Promise.resolve();

  const existing = document.querySelector(
    'script[src*="adsbygoogle.js"]'
  ) as HTMLScriptElement | null;
  if (existing?.getAttribute('data-loaded') === 'true') {
    markAdsenseScriptLoaded();
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('AdSense script timeout'));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener(ADSENSE_SCRIPT_EVENT, onReady);
    };

    window.addEventListener(ADSENSE_SCRIPT_EVENT, onReady, { once: true });
  });
}

export function pushAdsenseSlot(): boolean {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    return true;
  } catch {
    return false;
  }
}

declare global {
  interface Window {
    __wabAdsenseScriptLoaded?: boolean;
    adsbygoogle?: unknown[];
  }
}
