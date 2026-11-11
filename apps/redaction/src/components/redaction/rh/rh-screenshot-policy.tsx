'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** La décision est prise côté APK après lecture authentifiée de la politique serveur.
 * Le navigateur n'a pas d'API fiable pour interdire une capture d'écran. */
export function RhScreenshotPolicySync() {
  const pathname = usePathname();
  useEffect(() => {
    const rhPage = pathname === '/rh' || pathname.startsWith('/rh/') || pathname === '/mon-rh' || pathname.startsWith('/mon-rh/');
    const sync = () => {
      try {
        (window as Window & { AndroidBridge?: { syncRhScreenshotProtection?: () => void } }).AndroidBridge?.syncRhScreenshotProtection?.();
      } catch { /* Ancienne APK ou navigateur : aucun contrôle natif disponible. */ }
    };
    sync();
    if (!rhPage) return;
    const interval = window.setInterval(sync, 30_000);
    const onVisible = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('rh-screenshot-policy-changed', sync);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('rh-screenshot-policy-changed', sync);
    };
  }, [pathname]);
  return null;
}
