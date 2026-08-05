'use client';

import Link from 'next/link';
import type { MobileMenuFooterAction } from '@wab-infos/shared';
import { Tv } from 'lucide-react';
import { GooglePlayIcon } from '@/components/icons/google-play-icon';
import { siteConfig } from '@/config/site';

interface MobileMenuFooterCtaProps {
  action: MobileMenuFooterAction;
  playStoreUrl?: string;
  onNavigate?: () => void;
}

export function MobileMenuFooterCta({
  action,
  playStoreUrl = '',
  onNavigate,
}: MobileMenuFooterCtaProps) {
  if (action === 'none') return null;

  if (action === 'tv') {
    return (
      <div className="border-t border-border px-4 py-4 md:hidden">
        <Link
          href="/tv"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          onClick={onNavigate}
        >
          <Tv className="h-4 w-4" />
          Wab-infos TV
        </Link>
      </div>
    );
  }

  const href =
    playStoreUrl.trim() || siteConfig.androidPlayStoreUrl.trim() || siteConfig.androidApkUrl;

  const isPlayStore = href.includes('play.google.com');

  return (
    <div className="border-t border-border px-4 py-4 md:hidden">
      <a
        href={href}
        target={isPlayStore ? '_blank' : undefined}
        rel={isPlayStore ? 'noopener noreferrer' : undefined}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground shadow-sm transition-colors hover:bg-muted"
        onClick={onNavigate}
      >
        <GooglePlayIcon className="h-6 w-6 shrink-0" />
        <span>{isPlayStore ? 'Télécharger' : 'Télécharger l’application'}</span>
      </a>
    </div>
  );
}
