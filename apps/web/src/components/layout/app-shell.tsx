'use client';

import { Suspense, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

const AUTH_ONLY_PATHS = ['/connexion'];

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
  const isAuthPage = AUTH_ONLY_PATHS.includes(pathname);

  if (isAuthPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  return <SiteLayout>{children}</SiteLayout>;
}
