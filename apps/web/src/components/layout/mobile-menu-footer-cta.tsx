'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { isIosDevice, isNativeCapacitorFromUserAgent, type MobileMenuFooterAction } from '@wab-infos/shared';
import { Tv } from 'lucide-react';
import { GooglePlayIcon } from '@/components/icons/google-play-icon';
import { siteConfig } from '@/config/site';

interface MobileMenuFooterCtaProps {
  action: MobileMenuFooterAction;
  playStoreUrl?: string;
  onNavigate?: () => void;
}

/** Inutile dans l'app Android elle-même ou sur iPhone (pas de Play Store). */
function useCanOfferAndroidApp(): boolean {
  const [canOffer, setCanOffer] = useState(true);
  useEffect(() => {
    setCanOffer(!isNativeCapacitorFromUserAgent() && !isIosDevice());
  }, []);
  return canOffer;
}

export function MobileMenuFooterCta({
  action,
  playStoreUrl = '',
  onNavigate,
}: MobileMenuFooterCtaProps) {
  const canOfferApp = useCanOfferAndroidApp();

  if (action === 'none') return null;

  const showTv = action === 'tv' || action === 'tv_only';
  const showApp = (action === 'tv' || action === 'play_store') && canOfferApp;
  if (!showTv && !showApp) return null;

  const href =
    playStoreUrl.trim() || siteConfig.androidPlayStoreUrl.trim() || siteConfig.androidApkUrl;
  const isPlayStore = href.includes('play.google.com');

  return (
    <div className={`grid gap-2.5 border-t border-border px-4 py-4 md:hidden ${showTv && showApp ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {showTv ? (
        <Link
          href="/tv"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          onClick={onNavigate}
        >
          <Tv className="h-4 w-4 shrink-0" />
          <span className="truncate">Wab-infos TV</span>
        </Link>
      ) : null}
      {showApp ? (
        <a
          href={href}
          target={isPlayStore ? '_blank' : undefined}
          rel={isPlayStore ? 'noopener noreferrer' : undefined}
          download={isPlayStore ? undefined : true}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-foreground shadow-sm transition-colors hover:bg-muted"
          onClick={onNavigate}
        >
          <GooglePlayIcon className="h-6 w-6 shrink-0" />
          <span className="min-w-0 text-left leading-tight">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {isPlayStore ? 'Google Play' : 'Android'}
            </span>
            <span className="block truncate text-sm font-bold">Télécharger l’app</span>
          </span>
        </a>
      ) : null}
    </div>
  );
}
