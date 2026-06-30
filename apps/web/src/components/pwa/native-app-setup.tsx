'use client';

import { useLayoutEffect } from 'react';
import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';

/** Marqueur CSS + réglages scroll pour l’APK Capacitor (WebView). */
export function NativeAppSetup() {
  useLayoutEffect(() => {
    if (!isNativeCapacitorFromUserAgent()) return;

    document.documentElement.classList.add('native-capacitor');

    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  return null;
}
