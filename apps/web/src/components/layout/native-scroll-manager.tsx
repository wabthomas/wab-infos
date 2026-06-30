'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect } from 'react';
import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';

/** Évite le double-saut de scroll WebView lors des navigations Next.js (APK). */
export function NativeScrollManager() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!isNativeCapacitorFromUserAgent()) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}
