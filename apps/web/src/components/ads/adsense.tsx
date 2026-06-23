'use client';

import { useEffect, useRef } from 'react';
import { siteConfig } from '@/config/site';
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

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
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
  const client = siteConfig.adsenseClient;

  useEffect(() => {
    if (!client || !resolvedSlot || loaded.current) return;

    const loadAd = () => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        loaded.current = true;
      } catch {
        // AdSense pas encore chargé
      }
    };

    if (!lazy) {
      loadAd();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadAd();
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (adRef.current) observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [client, lazy, resolvedSlot]);

  if (!client || !resolvedSlot) {
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
        style={{ display: 'block', textAlign: layout === 'in-article' ? 'center' : undefined, ...style }}
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
  const headerSlot = siteConfig.adsenseSlots.header?.trim();
  if (!siteConfig.adsenseClient || !headerSlot) return null;

  return (
    <div className="container mx-auto hidden px-4 py-2 md:block">
      <AdSense slot={headerSlot} format="horizontal" lazy className="my-0" label="header" />
    </div>
  );
}

export function SidebarAd() {
  const sidebarSlot = siteConfig.adsenseSlots.sidebar?.trim();
  if (!siteConfig.adsenseClient || !sidebarSlot) return null;

  return (
    <div className="sticky top-20 hidden lg:block">
      <AdSense
        slot={sidebarSlot}
        format="vertical"
        className="mb-6"
        label="sidebar"
      />
    </div>
  );
}

export function ArticleTopAd() {
  const slot = siteConfig.adsenseSlots.articleTop?.trim();
  if (!siteConfig.adsenseClient || !slot) return null;

  return (
    <AdSense
      slot={slot}
      format="horizontal"
      lazy={false}
      label="article-top"
    />
  );
}

/** Format « In-article » AdSense — à placer entre les paragraphes */
export function ArticleInContentAd() {
  return (
    <AdSense
      slot={siteConfig.adsenseSlots.articleInContent}
      format="fluid"
      layout="in-article"
      label="article-in-content"
    />
  );
}

export function ArticleMidAd() {
  return (
    <AdSense
      slot={siteConfig.adsenseSlots.articleMid}
      format="rectangle"
      label="article-mid"
    />
  );
}

export function ArticleBottomAd() {
  return (
    <AdSense
      slot={siteConfig.adsenseSlots.articleBottom}
      format="horizontal"
      label="article-bottom"
    />
  );
}

/** @deprecated Utiliser ArticleBottomAd */
export function InArticleAd() {
  return <ArticleBottomAd />;
}

export function StickyMobileAd() {
  if (!siteConfig.adsenseClient || !siteConfig.adsenseSlots.mobileSticky) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      <AdSense
        slot={siteConfig.adsenseSlots.mobileSticky}
        format="horizontal"
        lazy={false}
        className="my-0"
        label="mobile-sticky"
      />
    </div>
  );
}
