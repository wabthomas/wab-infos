'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { persistPwaVariantFromPath } from '@/lib/pwa/detect';
import { registerSiteServiceWorker } from '@/lib/pwa/register-site-sw';

export function PwaSetup() {
  const pathname = usePathname();

  useEffect(() => {
    registerSiteServiceWorker().catch(() => undefined);
  }, []);

  useEffect(() => {
    persistPwaVariantFromPath(pathname);
  }, [pathname]);

  useEffect(() => {
    function onAppInstalled() {
      persistPwaVariantFromPath(window.location.pathname);
    }

    window.addEventListener('appinstalled', onAppInstalled);
    return () => window.removeEventListener('appinstalled', onAppInstalled);
  }, []);

  return null;
}
