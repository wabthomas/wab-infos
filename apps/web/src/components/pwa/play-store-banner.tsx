'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { isAndroidDevice, isNativeCapacitorFromUserAgent } from '@wab-infos/shared';
import { siteConfig } from '@/config/site';
import { GooglePlayIcon } from '@/components/icons/google-play-icon';
import { useSiteChrome } from '@/components/providers/site-chrome-context';
import { detectInstalledAndroidApp, isStandalonePwa } from '@/lib/pwa/detect';

const SHOW_AFTER_MS = 30_000;
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
const STATE_KEY = 'wab_play_banner';
/** Début de la visite en cours : le délai court sur toutes les pages, même après rechargement. */
const VISIT_START_KEY = 'wab_visit_started_at';

type BannerState = { status: 'dismissed' | 'clicked' | 'installed'; at: number };

function readState(): BannerState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as BannerState) : null;
  } catch {
    return null;
  }
}

function writeState(status: BannerState['status']) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ status, at: Date.now() }));
  } catch {
    // stockage indisponible : le bandeau réapparaîtra à la prochaine visite
  }
}

function isSnoozed(state: BannerState | null): boolean {
  if (!state) return false;
  if (state.status === 'installed') return true;
  return Date.now() - state.at < SNOOZE_MS;
}

function visitElapsedMs(): number {
  try {
    const raw = sessionStorage.getItem(VISIT_START_KEY);
    const startedAt = raw ? Number(raw) : NaN;
    if (Number.isFinite(startedAt)) return Date.now() - startedAt;
    sessionStorage.setItem(VISIT_START_KEY, String(Date.now()));
  } catch {
    // ignore
  }
  return 0;
}

function withReferrer(url: string): string {
  if (!/play\.google\.com/i.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('referrer')) {
      parsed.searchParams.set('referrer', 'utm_source=wab-infos.com&utm_medium=site_banner');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function PlayStoreBanner() {
  const { chrome } = useSiteChrome();
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  const playUrl = withReferrer(
    chrome.mobileMenuPlayStoreUrl?.trim() || siteConfig.androidPlayStoreUrl
  );

  useEffect(() => {
    if (!isAndroidDevice() || isNativeCapacitorFromUserAgent() || isStandalonePwa()) return;
    if (isSnoozed(readState())) return;

    let cancelled = false;
    let timer: number | undefined;

    void (async () => {
      const flags = await fetch('/api/site-settings', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);
      if (cancelled) return;
      if (flags && (flags.apkBannerEnabled === false || flags.apkBannerVisible === false)) return;

      if (await detectInstalledAndroidApp(siteConfig.androidAppPackage)) {
        writeState('installed');
        return;
      }
      if (cancelled) return;

      const remaining = Math.max(0, SHOW_AFTER_MS - visitElapsedMs());
      timer = window.setTimeout(() => {
        if (!cancelled && !isSnoozed(readState())) setVisible(true);
      }, remaining);
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, [visible]);

  function close(status: BannerState['status']) {
    writeState(status);
    setEntered(false);
    window.setTimeout(() => setVisible(false), 200);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Application Wab-infos sur Google Play"
      className={`fixed inset-x-3 bottom-[calc(3.75rem+env(safe-area-inset-bottom)+0.75rem)] z-[60] transition-all duration-200 ease-out md:inset-x-auto md:bottom-5 md:left-5 md:w-[22rem] ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="rounded-2xl border border-border bg-card p-4 shadow-2xl shadow-black/15">
        <div className="flex items-start gap-3">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={52}
            height={52}
            className="shrink-0 rounded-2xl ring-1 ring-border"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">Wab-infos sur Google Play</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              L’actualité en direct, les alertes et une lecture plus rapide dans l’application.
            </p>
          </div>
          <button
            type="button"
            onClick={() => close('dismissed')}
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3.5 flex items-center gap-2">
          <a
            href={playUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => close('clicked')}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-md shadow-primary/25 active:scale-[0.98]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white">
              <GooglePlayIcon className="h-4 w-4" />
            </span>
            Installer l’app
          </a>
          <button
            type="button"
            onClick={() => close('dismissed')}
            className="h-11 rounded-xl px-4 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
