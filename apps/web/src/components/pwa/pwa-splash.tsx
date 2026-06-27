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

const SPLASH_MS_PWA = 1500;
const SPLASH_MS_NATIVE_MIN = 1800;
const SPLASH_MS_NATIVE_MAX = 12000;
const FADE_OUT_MS = 420;

function hideBootstrapSplash() {
  document.getElementById('pwa-splash-bootstrap')?.classList.add('pwa-splash-bootstrap--done');
}

function finishAppLaunch() {
  document.documentElement.classList.remove('pwa-launching');
  document.documentElement.classList.add('pwa-splash-done');
  hideBootstrapSplash();
}

export function PwaSplash() {
  const [phase, setPhase] = useState<'hidden' | 'in' | 'out'>('hidden');
  const [tagline, setTagline] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Chargement');

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
      setTagline(variant === 'redaction' ? 'Rédaction' : siteConfig.name);
      setPhase('in');

      const minMs = asyncNative ? SPLASH_MS_NATIVE_MIN : SPLASH_MS_PWA;
      const maxWaitMs = asyncNative ? SPLASH_MS_NATIVE_MAX : 5000;
      const startedAt = performance.now();

      if (asyncNative) {
        setStatusText('Connexion');
        await waitForPageReady(maxWaitMs);
        if (cancelled) return;
        setStatusText('Presque prêt');
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
      className={`app-launch-splash pwa-splash fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-white ${
        phase === 'out' ? 'pwa-splash--out app-launch-splash--out' : ''
      }`}
      aria-hidden="true"
      role="presentation"
    >
      <div className="app-launch-splash__glow" aria-hidden />
      <div className="pwa-splash-logo-wrap app-launch-splash-logo-wrap">
        <Image
          src="/icons/icon-512.png"
          alt={siteConfig.name}
          width={512}
          height={512}
          className="pwa-splash-logo app-launch-splash-logo"
          priority
        />
      </div>
      {tagline && (
        <p className="pwa-splash-tagline app-launch-splash-tagline mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          {tagline}
        </p>
      )}
      <div className="app-launch-splash-loader mt-10 flex w-[min(72vw,16rem)] flex-col items-center gap-3">
        <div className="app-launch-splash-progress-track" aria-hidden>
          <div className="app-launch-splash-progress-bar" />
        </div>
        <p className="app-launch-splash-status text-[11px] font-medium tracking-wide text-neutral-500">
          {statusText}
          <span className="app-launch-splash-dots" aria-hidden>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
      </div>
    </div>
  );
}
