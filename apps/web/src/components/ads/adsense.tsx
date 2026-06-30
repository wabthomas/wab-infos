'use client';

import { useEffect, useRef, useState } from 'react';
import { shouldShowAdsClient } from '@/lib/ads/should-show-ads';
import { useAdsenseConfig } from '@/components/ads/adsense-config-context';
import { pushAdsenseSlot, waitForAdsenseScript } from '@/lib/adsense-loader';
import { cn } from '@/lib/utils';

type AdFormat = 'auto' | 'rectangle' | 'horizontal' | 'vertical' | 'fluid';
type AdLayout = 'in-article';

interface AdSenseProps {
  slot?: string;
  format?: AdFormat;
  layout?: AdLayout;
  className?: string;
  style?: React.CSSProperties;
  lazy?: boolean;
  label?: string;
}

function resolveSlot(slot?: string): string | undefined {
  const value = slot?.trim();
  return value || undefined;
}

export function AdSense({
  slot,
  format = 'auto',
  layout,
  className,
  style,
  lazy = true,
  label,
}: AdSenseProps) {
  const adRef = useRef<HTMLModElement>(null);
  const loaded = useRef(false);
  const resolvedSlot = resolveSlot(slot);
  const { client } = useAdsenseConfig();
  const [adsEnabled, setAdsEnabled] = useState(true);

  useEffect(() => {
    setAdsEnabled(shouldShowAdsClient());
  }, []);

  useEffect(() => {
    if (!adsEnabled || !client || !resolvedSlot || loaded.current) return;
    let cancelled = false;
    let observer: IntersectionObserver | null = null;

    const fillAd = async () => {
      try {
        await waitForAdsenseScript();
      } catch {
        return;
      }

      for (let attempt = 0; attempt < 24 && !cancelled && !loaded.current; attempt += 1) {
        if (pushAdsenseSlot()) {
          loaded.current = true;
          observer?.disconnect();
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 150));
      }
    };

    if (!lazy) {
      void fillAd();
      return () => {
        cancelled = true;
      };
    }

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void fillAd();
        }
      },
      { rootMargin: '240px' }
    );

    if (adRef.current) observer.observe(adRef.current);

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [adsEnabled, client, lazy, resolvedSlot]);

  if (!adsEnabled || !client || !resolvedSlot) {
    if (process.env.NODE_ENV === 'production') return null;
    if (!resolvedSlot) return null;

    return (
      <div
        className={cn(
          'flex min-h-[90px] items-center justify-center rounded border border-dashed border-muted-foreground/20 bg-muted/30 px-3 text-center text-xs text-muted-foreground',
          className
        )}
        aria-hidden
      >
        {label ? `Pub — ${label}` : 'Emplacement publicitaire'}
      </div>
    );
  }

  const minHeight =
    layout === 'in-article' ? 250 : format === 'vertical' ? 600 : format === 'horizontal' ? 90 : 90;

  return (
    <div
      className={cn('ad-container my-6 overflow-hidden', className)}
      style={{ minHeight }}
      data-ad-placement={label}
    >
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{
          display: 'block',
          textAlign: layout === 'in-article' ? 'center' : undefined,
          ...style,
        }}
        data-ad-client={client}
        data-ad-slot={resolvedSlot}
        data-ad-format={format}
        {...(layout ? { 'data-ad-layout': layout } : {})}
        data-full-width-responsive="true"
      />
    </div>
  );
}

export function HeaderAd() {
  const { client, slots } = useAdsenseConfig();
  const headerSlot = slots.header?.trim();
  if (!client || !headerSlot) return null;

  return (
    <div className="container mx-auto hidden px-4 py-2 md:block">
      <AdSense slot={headerSlot} format="horizontal" lazy className="my-0" label="header" />
    </div>
  );
}

export function SidebarAd() {
  const { client, slots } = useAdsenseConfig();
  const sidebarSlot = slots.sidebar?.trim();
  if (!client || !sidebarSlot) return null;

  return (
    <div className="sticky top-20 hidden lg:block">
      <AdSense slot={sidebarSlot} format="vertical" className="mb-6" label="sidebar" />
    </div>
  );
}

export function ArticleTopAd() {
  const { client, slots } = useAdsenseConfig();
  const slot = slots.articleTop?.trim();
  if (!client || !slot) return null;

  return <AdSense slot={slot} format="horizontal" lazy label="article-top" />;
}

/** Format « In-article » AdSense — à placer entre les paragraphes */
export function ArticleInContentAd() {
  const { client, slots } = useAdsenseConfig();
  const slot = slots.articleInContent?.trim();
  if (!client || !slot) return null;

  return (
    <AdSense slot={slot} format="fluid" layout="in-article" lazy label="article-in-content" />
  );
}

export function ArticleMidAd() {
  const { client, slots } = useAdsenseConfig();
  const slot = slots.articleMid?.trim();
  if (!client || !slot) return null;

  return <AdSense slot={slot} format="rectangle" label="article-mid" />;
}

export function ArticleBottomAd() {
  const { client, slots } = useAdsenseConfig();
  const slot = slots.articleBottom?.trim();
  if (!client || !slot) return null;

  return <AdSense slot={slot} format="horizontal" lazy label="article-bottom" />;
}

/** @deprecated Utiliser ArticleBottomAd */
export function InArticleAd() {
  return <ArticleBottomAd />;
}

export function StickyMobileAd() {
  const { client, slots } = useAdsenseConfig();
  const [adsEnabled, setAdsEnabled] = useState(true);

  useEffect(() => {
    setAdsEnabled(shouldShowAdsClient());
  }, []);

  const slot = slots.mobileSticky?.trim();
  if (!adsEnabled || !client || !slot) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      <AdSense slot={slot} format="horizontal" lazy={false} className="my-0" label="mobile-sticky" />
    </div>
  );
}
