'use client';

import { useLayoutEffect, useState } from 'react';
import Image from 'next/image';
import { siteConfig } from '@/config/site';
import { getPwaVariant, isStandalonePwa, persistPwaVariantFromPath } from '@/lib/pwa/detect';

const SPLASH_MS = 1400;

function hideBootstrapSplash() {
  document.getElementById('pwa-splash-bootstrap')?.classList.add('pwa-splash-bootstrap--done');
}

function finishPwaLaunch() {
  document.documentElement.classList.remove('pwa-launching');
  document.documentElement.classList.add('pwa-splash-done');
  hideBootstrapSplash();
}

export function PwaSplash() {
  const [phase, setPhase] = useState<'hidden' | 'in' | 'out'>('hidden');
  const [tagline, setTagline] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!isStandalonePwa()) {
      finishPwaLaunch();
      return;
    }

    hideBootstrapSplash();

    persistPwaVariantFromPath(window.location.pathname);
    const variant = getPwaVariant();
    setTagline(variant === 'redaction' ? 'Rédaction' : siteConfig.name);
    setPhase('in');

    const fadeOut = window.setTimeout(() => setPhase('out'), SPLASH_MS - 350);
    const hide = window.setTimeout(() => {
      setPhase('hidden');
      finishPwaLaunch();
    }, SPLASH_MS);

    return () => {
      window.clearTimeout(fadeOut);
      window.clearTimeout(hide);
    };
  }, []);

  if (phase === 'hidden') return null;

  return (
    <div
      className={`pwa-splash fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-white ${
        phase === 'out' ? 'pwa-splash--out' : ''
      }`}
      aria-hidden="true"
    >
      <div className="pwa-splash-logo-wrap">
        <Image
          src="/logo.png"
          alt={siteConfig.name}
          width={338}
          height={259}
          className="pwa-splash-logo h-28 w-auto sm:h-32"
          priority
        />
      </div>
      {tagline && (
        <p className="pwa-splash-tagline mt-6 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          {tagline}
        </p>
      )}
    </div>
  );
}
