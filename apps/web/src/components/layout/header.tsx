'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu, Tv, X } from 'lucide-react';
import { categories, siteConfig } from '@/config/site';
import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';
import { SiteLogo } from '@/components/brand/site-logo';
import { HeaderAuthLink } from '@/components/layout/header-auth-link';
import { HeaderSearch } from '@/components/layout/header-search';
import { MobileMenuToolbar } from '@/components/layout/mobile-menu-toolbar';
import { PushAlertsIconButton } from '@/components/layout/push-alerts-icon-button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

const utilityLinks = [
  { label: 'Wab-infos TV', href: '/tv' },
  { label: 'Newsletter', href: '/#newsletter' },
  { label: 'Contact', href: '/contact' },
];

const mainNavCategories = categories.filter((cat) => cat.slug !== 'wab-infos-tv');

const serviceLinks = [
  { label: 'Wab-infos TV', href: '/tv', description: 'Direct & replays' },
  { label: 'Recherche avancée', href: '/recherche', description: 'Tous les articles' },
  { label: 'Flux RSS', href: '/feed.xml', description: 'Suivre l\'actualité' },
];

const infoLinks = [
  { label: 'À propos', href: '/a-propos' },
  { label: 'Contact', href: '/contact' },
  { label: 'Mentions légales', href: '/mentions-legales' },
];

interface HeaderProps {
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
}

export function Header({ menuOpen: menuOpenProp, onMenuOpenChange }: HeaderProps = {}) {
  const [menuOpenInternal, setMenuOpenInternal] = useState(false);
  const menuOpen = menuOpenProp ?? menuOpenInternal;
  const setMenuOpen = onMenuOpenChange ?? setMenuOpenInternal;
  const [isPinned, setIsPinned] = useState(false);
  const [barHeight, setBarHeight] = useState(64);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const mainBarRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const rubricsScrollRef = useRef<HTMLDivElement>(null);

  const isActive = (slug: string) =>
    pathname === `/${slug}` || pathname.startsWith(`/${slug}/`);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, setMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsPinned(!entry.isIntersecting),
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const bar = mainBarRef.current;
    if (!bar) return;

    const updateHeight = () => setBarHeight(bar.offsetHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const scrollEl = rubricsScrollRef.current;
    if (!scrollEl) return;

    const activeLink = scrollEl.querySelector<HTMLElement>('[data-rubric-active="true"]');
    const scrollBehavior = isNativeCapacitorFromUserAgent() ? 'auto' : 'smooth';
    activeLink?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: scrollBehavior });
  }, [pathname]);

  return (
    <>
      {/* Barre utilitaire — défile avec la page */}
      <div className="hidden border-b border-border/80 bg-[#111111] text-white md:block dark:bg-[#0a0a0a]">
        <div className="container mx-auto flex h-9 items-center justify-between px-4 text-[11px] font-medium tracking-wide">
          <span className="text-white/70">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
          <nav className="flex items-center gap-5">
            {utilityLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/80 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div ref={sentinelRef} className="h-px w-full" aria-hidden />

      {/* Barre principale — fixée en haut une fois la zone supérieure défilée */}
      <header
        ref={mainBarRef}
        className={cn(
          'z-50 w-full border-b border-border bg-background transition-shadow duration-200',
          isNativeCapacitorFromUserAgent()
            ? 'bg-background'
            : 'supports-[backdrop-filter]:bg-background/95 supports-[backdrop-filter]:backdrop-blur-sm',
          isPinned
            ? 'native-safe-top fixed left-0 right-0 shadow-md'
            : 'relative shadow-[0_1px_0_0_rgba(0,0,0,0.04)]'
        )}
      >
        <div className="container relative mx-auto flex h-14 items-center justify-between gap-2 px-3 md:h-[4.5rem] md:gap-4 md:px-4">
          {/* Gauche : recherche (mobile) / menu + recherche (desktop) */}
          <div className="z-10 flex min-w-0 flex-1 items-center justify-start gap-0.5 md:gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="hidden h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-muted md:inline-flex"
              aria-expanded={menuOpen}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
              Menu
            </button>

            <HeaderSearch className="min-w-0" />
          </div>

          {/* Centre : logo */}
          <Link
            href="/"
            className="group absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
            aria-label={`${siteConfig.name} — Accueil`}
          >
            <SiteLogo
              priority
              className="h-10 w-auto transition-opacity group-hover:opacity-90 md:h-16"
            />
          </Link>

          {/* Droite : alertes + TV (mobile) / thème + connexion + TV (desktop) */}
          <div className="z-10 flex flex-1 items-center justify-end gap-0.5 md:gap-2">
            <div className="flex items-center md:hidden">
              <PushAlertsIconButton />
            </div>
            <ThemeToggle className="hidden md:inline-flex" />
            <HeaderAuthLink className="hidden md:inline-flex" />
            <Link
              href="/tv"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 md:h-auto md:w-auto md:gap-1.5 md:px-4 md:py-2"
              aria-label="Wab-infos TV"
            >
              <Tv className="h-5 w-5 shrink-0 md:h-4 md:w-4" />
              <span className="hidden text-sm font-bold uppercase tracking-wider md:inline">
                Wab-infos TV
              </span>
            </Link>
          </div>
        </div>
      </header>

      {isPinned && <div aria-hidden style={{ height: barHeight }} />}

      {/* Rubriques — défilement horizontal sur mobile / tablette */}
      <nav
        className="border-b border-border bg-background lg:hidden"
        aria-label="Rubriques"
      >
        <div
          ref={rubricsScrollRef}
          className="flex flex-nowrap items-center gap-1.5 overflow-x-auto overflow-y-hidden px-3 py-2.5 scrollbar-none touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch] sm:px-4"
        >
          <Link
            href="/"
            data-rubric-active={pathname === '/' ? 'true' : undefined}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors',
              pathname === '/'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground/80'
            )}
          >
            À la une
          </Link>
          {mainNavCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/${cat.slug}`}
              data-rubric-active={isActive(cat.slug) ? 'true' : undefined}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors',
                isActive(cat.slug)
                  ? 'text-white'
                  : 'bg-muted text-foreground/80'
              )}
              style={
                isActive(cat.slug)
                  ? { backgroundColor: cat.color }
                  : undefined
              }
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* Rubriques — barre desktop */}
      <nav
        className="hidden border-b border-border bg-background lg:block"
        aria-label="Rubriques"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
            <Link
              href="/"
              className={cn(
                'shrink-0 border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors',
                pathname === '/'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground/80 hover:border-foreground/20 hover:text-foreground'
              )}
            >
              À la une
            </Link>
            {mainNavCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className={cn(
                  'shrink-0 border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors',
                  isActive(cat.slug)
                    ? 'border-primary text-primary'
                    : 'border-transparent text-foreground/80 hover:border-foreground/20 hover:text-foreground'
                )}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Menu latéral */}
      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={() => setMenuOpen(false)}
            aria-label="Fermer le menu"
          />
          <aside
            className="fixed inset-y-0 left-0 z-[70] flex w-full max-w-sm flex-col bg-card shadow-2xl pt-[env(safe-area-inset-top)] sm:max-w-md"
            aria-label="Navigation principale"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <span className="text-sm font-bold uppercase tracking-widest text-foreground">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <MobileMenuToolbar className="md:hidden" onNavigate={() => setMenuOpen(false)} />

            <div className="border-b border-border px-4 py-4">
              <HeaderSearch compact onSubmit={() => setMenuOpen(false)} />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <section className="mb-8">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Rubriques
                </h2>
                <ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                    <li className="sm:col-span-2">
                      <Link
                        href="/"
                        className={cn(
                          'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          pathname === '/'
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted'
                        )}
                        onClick={() => setMenuOpen(false)}
                      >
                        À la une
                      </Link>
                    </li>
                    {mainNavCategories.map((cat) => (
                      <li key={cat.slug}>
                        <Link
                          href={`/${cat.slug}`}
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive(cat.slug)
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-muted'
                          )}
                          onClick={() => setMenuOpen(false)}
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
              </section>

              <section className="mb-8">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Services
                </h2>
                <ul className="space-y-1">
                  {serviceLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="text-sm font-medium">{link.label}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {link.description}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Wab-infos
                </h2>
                <ul className="space-y-1">
                  {infoLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                        onClick={() => setMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="border-t border-border px-4 py-4 md:hidden">
              <Link
                href="/tv"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
                onClick={() => setMenuOpen(false)}
              >
                <Tv className="h-4 w-4" />
                Wab-infos TV
              </Link>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
