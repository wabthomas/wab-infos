'use client';

import { Suspense, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { PwaInstallBanner } from '@/components/pwa/pwa-install-banner';

const AUTH_ONLY_PREFIXES = ['/connexion', '/redaction'];

function isRedactionLoginPath(pathname: string): boolean {
  return pathname === '/redaction/login' || pathname.startsWith('/redaction/login/');
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
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
  const showSiteInstallBanner = !isRedactionLoginPath(pathname);

  return (
    <>
      {showSiteInstallBanner && (
        <PwaInstallBanner variant="site" placement="fixed" />
      )}
      {isAuthPage ? (
        <main className="min-h-screen">{children}</main>
      ) : (
        <SiteLayout>{children}</SiteLayout>
      )}
    </>
  );
}
