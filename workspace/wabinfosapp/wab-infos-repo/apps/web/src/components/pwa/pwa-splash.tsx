'use client';

import { useLayoutEffect, useState } from 'react';
import Image from 'next/image';
import { siteConfig } from '@/config/site';
import { getPwaVariant, persistPwaVariantFromPath } from '@/lib/pwa/detect';
import {
  delay,
  hideNativeSplashScreen,
  isNativeCapacitorFromUserAgent,
  shouldShowLaunchSplashSync,
  waitForPageReady,
} from '@/lib/pwa/launch-splash';
import { isNativeCapacitorApp } from '@wab-infos/shared';

const SPLASH_MS_PWA = 1200;
const SPLASH_MS_NATIVE_MIN = 1000;
const SPLASH_MS_NATIVE_MAX = 12000;
const FADE_OUT_MS = 320;

const SPLASH_LOGO = '/brand-icon.png';

function hideBootstrapSplash() {
  document.getElementById('pwa-splash-bootstrap')?.classList.add('pwa-splash-bootstrap--done');
}

function finishAppLaunch() {
  document.documentElement.classList.remove('pwa-launching');
  document.documentElement.classList.add('pwa-splash-done');
  hideBootstrapSplash();
}

export function PwaSplash() {
  const [phase, setPhase] = useState<'hidden' | 'visible' | 'out'>('hidden');
  const [title, setTitle] = useState(siteConfig.name);
  const [tagline, setTagline] = useState<string>(siteConfig.tagline);

  useLayoutEffect(() => {
    let cancelled = false;

    async function run() {
      const syncNative = isNativeCapacitorFromUserAgent();
      const asyncNative = syncNative || (await isNativeCapacitorApp());
      const showSplash = shouldShowLaunchSplashSync() || asyncNative;

      if (!showSplash) {
        finishAppLaunch();
        return;
      }

      hideBootstrapSplash();

      persistPwaVariantFromPath(window.location.pathname);
      const variant = getPwaVariant();
      if (variant === 'redaction') {
        setTitle('Rédaction');
        setTagline(siteConfig.name);
      } else {
        setTitle(siteConfig.name);
        setTagline(siteConfig.tagline);
      }
      setPhase('visible');

      const minMs = asyncNative ? SPLASH_MS_NATIVE_MIN : SPLASH_MS_PWA;
      const maxWaitMs = asyncNative ? SPLASH_MS_NATIVE_MAX : 5000;
      const startedAt = performance.now();

      if (asyncNative) {
        await waitForPageReady(maxWaitMs);
        if (cancelled) return;
      }

      const elapsed = performance.now() - startedAt;
      if (elapsed < minMs) {
        await delay(minMs - elapsed);
      }
      if (cancelled) return;

      setPhase('out');
      await hideNativeSplashScreen(FADE_OUT_MS);
      await delay(FADE_OUT_MS);
      if (cancelled) return;

      setPhase('hidden');
      finishAppLaunch();
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === 'hidden') return null;

  return (
    <div
      className={`app-launch-splash pwa-splash fixed inset-0 z-[10000] flex flex-col items-center justify-center px-6 ${
        phase === 'out' ? 'pwa-splash--out' : ''
      }`}
      aria-hidden="true"
      role="presentation"
    >
      <div className="app-launch-splash-logo-wrap">
        <Image
          src={SPLASH_LOGO}
          alt={siteConfig.name}
          width={256}
          height={256}
          className="app-launch-splash-logo"
          priority
          sizes="104px"
          quality={85}
        />
      </div>
      <p className="app-launch-splash-title">{title}</p>
      <p className="app-launch-splash-tagline max-w-xs text-center text-sm font-medium leading-snug text-white/90">
        {tagline}
      </p>
      {phase === 'visible' && (
        <p className="app-launch-splash-status mt-8 text-[11px] font-medium tracking-wide text-white/70">
          Chargement…
        </p>
      )}
    </div>
  );
}
