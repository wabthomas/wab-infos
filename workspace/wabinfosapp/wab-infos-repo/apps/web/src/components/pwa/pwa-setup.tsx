'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  getPwaVariant,
  inferPwaVariantFromPath,
  isStandalonePwa,
  markPwaInstalled,
  persistPwaVariantFromPath,
} from '@/lib/pwa/detect';
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
    if (isStandalonePwa()) {
      markPwaInstalled(getPwaVariant());
    }
  }, []);

  useEffect(() => {
    function onAppInstalled() {
      const variant = inferPwaVariantFromPath(window.location.pathname);
      persistPwaVariantFromPath(window.location.pathname);
      markPwaInstalled(variant);
    }

    window.addEventListener('appinstalled', onAppInstalled);
    return () => window.removeEventListener('appinstalled', onAppInstalled);
  }, []);

  return null;
}
