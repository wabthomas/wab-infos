const ADSENSE_SCRIPT_EVENT = 'wab-adsense-script-loaded';

export function markAdsenseScriptLoaded(): void {
  if (typeof window === 'undefined') return;
  if (window.__wabAdsenseScriptLoaded) return;
  window.__wabAdsenseScriptLoaded = true;
  const script = document.getElementById('adsense-script');
  script?.setAttribute('data-loaded', 'true');
  window.dispatchEvent(new Event(ADSENSE_SCRIPT_EVENT));
}

export function isAdsenseScriptLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.__wabAdsenseScriptLoaded);
}

function hasExecutableAdsenseScript(): boolean {
  const script = document.querySelector(
    'script[src*="adsbygoogle.js"]'
  ) as HTMLScriptElement | null;
  if (!script) return false;
  if (script.getAttribute('data-loaded') === 'true') return true;
  // Le script a tourné dès que le tableau global existe.
  return Array.isArray(window.adsbygoogle);
}

/**
 * Attend le script AdSense. Ne dépend pas uniquement de onLoad (souvent raté
 * avec next/script + navigations App Router).
 */
export function waitForAdsenseScript(timeoutMs = 15_000): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (isAdsenseScriptLoaded() || hasExecutableAdsenseScript()) {
    markAdsenseScriptLoaded();
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (ok: boolean, error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.clearInterval(poll);
      window.removeEventListener(ADSENSE_SCRIPT_EVENT, onEvent);
      scriptEl?.removeEventListener('load', onEvent);
      if (ok) {
        markAdsenseScriptLoaded();
        resolve();
      } else {
        reject(error ?? new Error('AdSense script timeout'));
      }
    };

    const onEvent = () => finish(true);

    const poll = window.setInterval(() => {
      if (isAdsenseScriptLoaded() || hasExecutableAdsenseScript()) finish(true);
    }, 200);

    const timer = window.setTimeout(() => {
      if (isAdsenseScriptLoaded() || hasExecutableAdsenseScript()) finish(true);
      else finish(false, new Error('AdSense script timeout'));
    }, timeoutMs);

    window.addEventListener(ADSENSE_SCRIPT_EVENT, onEvent, { once: true });

    const scriptEl = document.querySelector(
      'script[src*="adsbygoogle.js"]'
    ) as HTMLScriptElement | null;
    scriptEl?.addEventListener('load', onEvent, { once: true });
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
