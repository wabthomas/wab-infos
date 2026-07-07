'use client';

import { useLayoutEffect } from 'react';
import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';
import { configureNativeAndroidStatusBar } from '@/lib/pwa/native-status-bar';

/** Marqueur CSS + barre de statut APK Capacitor. */
export function NativeAppSetup() {
  useLayoutEffect(() => {
    if (!isNativeCapacitorFromUserAgent()) return;

    document.documentElement.classList.add('native-capacitor');
    void configureNativeAndroidStatusBar();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void configureNativeAndroidStatusBar();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return null;
}
