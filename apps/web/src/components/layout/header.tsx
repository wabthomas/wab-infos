'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LogIn, Menu, Tv, X } from 'lucide-react';
import { categories, siteConfig } from '@/config/site';
import { SiteLogo } from '@/components/brand/site-logo';
import { HeaderSearch } from '@/components/layout/header-search';
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
  const [barHeight, setBarHeight] = useState(72);
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
    activeLink?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
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
          'z-50 w-full border-b border-border bg-background transition-shadow duration-200 supports-[backdrop-filter]:bg-background/95 supports-[backdrop-filter]:backdrop-blur-sm',
          isPinned
            ? 'fixed top-0 left-0 right-0 shadow-md'
            : 'relative shadow-[0_1px_0_0_rgba(0,0,0,0.04)]'
        )}
      >
        <div className="container relative mx-auto flex h-16 items-center justify-between gap-2 px-3 sm:h-[5.25rem] sm:gap-4 sm:px-4 md:h-24">
          {/* Gauche : menu + recherche */}
          <div className="z-10 flex min-w-0 flex-1 items-center justify-start gap-0.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2 sm:text-sm sm:font-semibold sm:uppercase sm:tracking-wider"
              aria-expanded={menuOpen}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
              <span className="hidden sm:inline">Menu</span>
            </button>

            <HeaderSearch className="min-w-0" />
          </div>

          {/* Centre : logo (position absolue pour ne pas pousser les côtés) */}
          <Link
            href="/"
            className="group absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
            aria-label={`${siteConfig.name} — Accueil`}
          >
            <SiteLogo priority className="transition-opacity group-hover:opacity-90" />
          </Link>

          {/* Droite : thème + connexion + TV */}
          <div className="z-10 flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link
              href="/connexion"
              className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:inline-flex"
            >
              <LogIn className="h-4 w-4" />
              Se connecter
            </Link>
            <Link
              href="/tv"
              className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-2.5 text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:h-auto sm:px-4 sm:py-2 sm:text-sm sm:font-bold sm:uppercase sm:tracking-wider"
              aria-label="Wab-infos TV"
            >
              <Tv className="h-4 w-4 shrink-0" />
              <span className="hidden text-xs font-bold uppercase tracking-wider min-[400px]:inline sm:text-sm">
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

            <div className="border-b border-border px-4 py-4">
              <HeaderSearch compact onSubmit={() => setMenuOpen(false)} />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <section className="mb-8">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Rubriques
                </h2>
                <div className="-mx-4 overflow-x-auto px-4 pb-1 scrollbar-none touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch] sm:mx-0 sm:px-0 sm:overflow-visible">
                  <ul className="flex w-max flex-nowrap gap-2 sm:grid sm:w-full sm:grid-cols-2 sm:gap-0.5">
                    <li className="shrink-0 sm:col-span-2 sm:shrink">
                      <Link
                        href="/"
                        className={cn(
                          'flex items-center whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors sm:rounded-lg sm:px-3 sm:py-2.5 sm:text-sm',
                          pathname === '/'
                            ? 'bg-primary text-primary-foreground sm:bg-primary/10 sm:text-primary'
                            : 'bg-muted text-foreground/80 sm:bg-transparent sm:hover:bg-muted'
                        )}
                        onClick={() => setMenuOpen(false)}
                      >
                        À la une
                      </Link>
                    </li>
                    {mainNavCategories.map((cat) => (
                      <li key={cat.slug} className="shrink-0 sm:shrink">
                        <Link
                          href={`/${cat.slug}`}
                          className={cn(
                            'flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors sm:rounded-lg sm:px-3 sm:py-2.5 sm:text-sm sm:font-medium',
                            isActive(cat.slug)
                              ? 'text-white sm:!bg-primary/10 sm:text-primary'
                              : 'bg-muted text-foreground/80 sm:bg-transparent sm:hover:bg-muted'
                          )}
                          style={
                            isActive(cat.slug)
                              ? { backgroundColor: cat.color }
                              : undefined
                          }
                          onClick={() => setMenuOpen(false)}
                        >
                          <span
                            className="hidden h-2 w-2 shrink-0 rounded-full sm:inline-block"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
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

            <div className="border-t border-border px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/connexion"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  <LogIn className="h-4 w-4" />
                  Se connecter
                </Link>
                <Link
                  href="/tv"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
                  onClick={() => setMenuOpen(false)}
                >
                  <Tv className="h-4 w-4" />
                  Wab-infos TV
                </Link>
              </div>
              <div className="mt-3 flex items-center justify-between sm:hidden">
                <span className="text-sm text-muted-foreground">Thème</span>
                <ThemeToggle />
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
