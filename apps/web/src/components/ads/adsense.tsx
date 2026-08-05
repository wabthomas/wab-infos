'use client';

import { useEffect, useRef, useState } from 'react';
import { shouldShowAdsClient } from '@/lib/ads/should-show-ads';
import { useAdsenseConfig } from '@/components/ads/adsense-config-context';
import { useSiteChrome } from '@/components/providers/site-chrome-context';
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
  /** Si false, ne réserve pas de hauteur vide (évite un trou blanc avant chargement). */
  reserveMinHeight?: boolean;
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
  reserveMinHeight = true,
}: AdSenseProps) {
  const adRef = useRef<HTMLModElement>(null);
  const loaded = useRef(false);
  const resolvedSlot = resolveSlot(slot);
  const { client } = useAdsenseConfig();
  const { chrome } = useSiteChrome();
  const [adsEnabled, setAdsEnabled] = useState(true);

  useEffect(() => {
    setAdsEnabled(shouldShowAdsClient() && chrome.adsGloballyEnabled);
  }, [chrome.adsGloballyEnabled]);

  useEffect(() => {
    if (!adsEnabled || !client || !resolvedSlot || loaded.current) return;

    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    let fallbackTimer = 0;

    const fillAd = async () => {
      if (cancelled || loaded.current) return;
      try {
        await waitForAdsenseScript();
      } catch {
        return;
      }
      if (cancelled || loaded.current) return;

      for (let attempt = 0; attempt < 24 && !cancelled && !loaded.current; attempt += 1) {
        // L’élément doit être connecté avant push{}, sinon AdSense ignore le slot.
        if (!adRef.current?.isConnected) {
          await new Promise((resolve) => window.setTimeout(resolve, 100));
          continue;
        }
        if (pushAdsenseSlot()) {
          loaded.current = true;
          observer?.disconnect();
          if (fallbackTimer) window.clearTimeout(fallbackTimer);
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
        if (entry?.isIntersecting) void fillAd();
      },
      { rootMargin: '320px 0px', threshold: 0 }
    );

    const node = adRef.current;
    if (node) observer.observe(node);

    // Filet de sécurité si l’IO ne déclenche pas (conteneurs / contain CSS).
    fallbackTimer = window.setTimeout(() => {
      if (!loaded.current) void fillAd();
    }, 2800);

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
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
    !reserveMinHeight
      ? undefined
      : layout === 'in-article'
        ? 250
        : format === 'vertical'
          ? 600
          : format === 'horizontal'
            ? 90
            : 90;

  return (
    <div
      className={cn('ad-container my-6', className)}
      style={minHeight != null ? { minHeight } : undefined}
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

  // Pas de min-height réservée : un slot vide ne doit pas créer de bande blanche sous le menu.
  return (
    <div className="container mx-auto hidden px-4 md:block">
      <AdSense
        slot={headerSlot}
        format="horizontal"
        lazy
        reserveMinHeight={false}
        className="my-0"
        label="header"
      />
    </div>
  );
}

export function SidebarAd() {
  const { client, slots } = useAdsenseConfig();
  const sidebarSlot = slots.sidebar?.trim();
  if (!client || !sidebarSlot) return null;

  // Sticky géré par ContentSidebar — éviter un sticky imbriqué.
  // Pas de min-height 600px : un slot vide poussait toute la sidebar vers le bas.
  return (
    <div className="hidden lg:block">
      <AdSense
        slot={sidebarSlot}
        format="vertical"
        className="mb-6"
        label="sidebar"
        reserveMinHeight={false}
      />
    </div>
  );
}

export function ArticleTopAd() {
  const { client, slots } = useAdsenseConfig();
  const slot = slots.articleTop?.trim() || slots.articleInContent?.trim();
  if (!client || !slot) return null;

  return <AdSense slot={slot} format="horizontal" lazy={false} label="article-top" />;
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

  return <AdSense slot={slot} format="rectangle" lazy={false} label="article-mid" />;
}

export function ArticleBottomAd() {
  const { client, slots } = useAdsenseConfig();
  const slot = slots.articleBottom?.trim();
  if (!client || !slot) return null;

  return <AdSense slot={slot} format="horizontal" lazy={false} label="article-bottom" />;
}

/** @deprecated Utiliser ArticleBottomAd */
export function InArticleAd() {
  return <ArticleBottomAd />;
}

export function StickyMobileAd() {
  const { client, slots } = useAdsenseConfig();
  const { chrome } = useSiteChrome();
  const [adsEnabled, setAdsEnabled] = useState(true);

  useEffect(() => {
    setAdsEnabled(shouldShowAdsClient() && chrome.adsGloballyEnabled);
  }, [chrome.adsGloballyEnabled]);

  const slot = slots.mobileSticky?.trim();
  if (!adsEnabled || !client || !slot) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      <AdSense slot={slot} format="horizontal" lazy={false} className="my-0" label="mobile-sticky" />
    </div>
  );
}
