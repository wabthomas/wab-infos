'use client';

import { useEffect, useRef } from 'react';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

interface AdSenseProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  className?: string;
  style?: React.CSSProperties;
  lazy?: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSense({
  slot,
  format = 'auto',
  className,
  style,
  lazy = true,
}: AdSenseProps) {
  const adRef = useRef<HTMLModElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!siteConfig.adsenseClient || loaded.current) return;

    const loadAd = () => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        loaded.current = true;
      } catch {
        // AdSense not loaded yet
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
  }, [lazy, slot]);

  if (!siteConfig.adsenseClient) {
    return (
      <div
        className={cn(
          'flex min-h-[90px] items-center justify-center rounded border border-dashed border-muted-foreground/20 bg-muted/30 text-xs text-muted-foreground',
          className
        )}
      >
        Emplacement publicitaire
      </div>
    );
  }

  return (
    <div className={cn('ad-container overflow-hidden', className)} style={{ minHeight: format === 'auto' ? 90 : undefined }}>
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{ display: 'block', ...style }}
        data-ad-client={siteConfig.adsenseClient}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

export function SidebarAd() {
  return (
    <div className="sticky top-20">
      <AdSense slot="sidebar-ad" format="vertical" className="mb-6" />
    </div>
  );
}

export function InArticleAd() {
  return (
    <div className="my-8">
      <AdSense slot="in-article-ad" format="horizontal" lazy />
    </div>
  );
}

export function StickyMobileAd() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      <AdSense slot="sticky-mobile-ad" format="horizontal" lazy={false} />
    </div>
  );
}

export function HeaderAd() {
  return (
    <div className="container mx-auto px-4 py-2">
      <AdSense slot="header-ad" format="horizontal" />
    </div>
  );
}
