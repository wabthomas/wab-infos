'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { shouldShowAdsClient } from '@/lib/ads/should-show-ads';
import { useAdsenseConfig } from '@/components/ads/adsense-config-context';
import { markAdsenseScriptLoaded } from '@/lib/adsense-loader';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { PwaInstallBanner } from '@/components/pwa/pwa-install-banner';

const AUTH_ONLY_PREFIXES = ['/connexion'];

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { client } = useAdsenseConfig();
  const [adsEnabled, setAdsEnabled] = useState(true);

  useEffect(() => {
    setAdsEnabled(shouldShowAdsClient());
  }, []);

  return (
    <>
      {client && adsEnabled ? (
        <Script
          id="adsense-script"
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
          onLoad={markAdsenseScriptLoaded}
        />
      ) : null}
      <Header menuOpen={menuOpen} onMenuOpenChange={setMenuOpen} />
      <main className="flex-1 pb-[calc(3.75rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
      <Footer />
      <Suspense fallback={null}>
        <MobileBottomNav
          onOpenMenu={() => setMenuOpen((open) => !open)}
          menuOpen={menuOpen}
        />
      </Suspense>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isHomePage = pathname === '/';

  return (
    <>
      {isHomePage ? (
        <PwaInstallBanner variant="site" display="fab" showAfterMs={3000} />
      ) : null}
      {isAuthPage ? (
        <main className="min-h-screen">{children}</main>
      ) : (
        <SiteLayout>{children}</SiteLayout>
      )}
    </>
  );
}
