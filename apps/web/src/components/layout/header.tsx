'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, HeartHandshake, Menu, Tv, UserRound, X } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { getVisibleNavLinks, isNativeCapacitorFromUserAgent, normalizeSiteSupportSettings } from '@wab-infos/shared';
import { SiteLogo } from '@/components/brand/site-logo';
import { HeaderAuthLink } from '@/components/layout/header-auth-link';
import { HeaderSearch } from '@/components/layout/header-search';
import { MobileMenuAppVersion } from '@/components/layout/mobile-menu-app-version';
import { MobileMenuFooterCta } from '@/components/layout/mobile-menu-footer-cta';
import { MobileMenuToolbar } from '@/components/layout/mobile-menu-toolbar';
import { MobileSiteSettings } from '@/components/layout/mobile-site-settings';
import { PushAlertsIconButton } from '@/components/layout/push-alerts-icon-button';
import { useSiteChrome } from '@/components/providers/site-chrome-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAutoHideOnScroll } from '@/hooks/use-auto-hide-on-scroll';
import { resolveNavCategories } from '@/lib/resolve-nav-categories';
import { cn } from '@/lib/utils';

interface HeaderProps {
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
}

export function Header({ menuOpen: menuOpenProp, onMenuOpenChange }: HeaderProps = {}) {
  const { chrome } = useSiteChrome();
  const [menuOpenInternal, setMenuOpenInternal] = useState(false);
  const menuOpen = menuOpenProp ?? menuOpenInternal;
  const setMenuOpen = onMenuOpenChange ?? setMenuOpenInternal;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuLeaving, setMenuLeaving] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const rubricsScrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const headerVisible = useAutoHideOnScroll({ threshold: 40, delta: 6 });

  const mainNavCategories = useMemo(
    () => resolveNavCategories(chrome.navCategorySlugs),
    [chrome.navCategorySlugs]
  );
  const utilityLinks = useMemo(() => getVisibleNavLinks(chrome.utilityLinks), [chrome.utilityLinks]);
  const serviceLinks = useMemo(() => getVisibleNavLinks(chrome.serviceLinks), [chrome.serviceLinks]);
  const infoLinks = useMemo(() => getVisibleNavLinks(chrome.infoLinks), [chrome.infoLinks]);
  const support = useMemo(
    () => normalizeSiteSupportSettings(chrome.support),
    [chrome.support]
  );
  const subscribeLabel = support.headerButtonLabel.trim() || "S'abonner";
  const showSubscribeDesktop = support.headerButtonDesktopEnabled;
  const showSubscribeMobile = support.headerButtonMobileEnabled;

  const isActive = (slug: string) =>
    pathname === `/${slug}` || pathname.startsWith(`/${slug}/`);

  useEffect(() => {
    setMenuOpen(false);
    setSettingsOpen(false);
  }, [pathname, setMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen || menuMounted ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen, menuMounted]);

  useEffect(() => {
    if (menuOpen) {
      setMenuMounted(true);
      setMenuLeaving(false);
      return;
    }
    if (!menuMounted) return;
    setMenuLeaving(true);
    const timer = window.setTimeout(() => {
      setMenuMounted(false);
      setMenuLeaving(false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [menuOpen, menuMounted]);

  useEffect(() => {
    if (!menuOpen) setSettingsOpen(false);
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
    const scrollEl = rubricsScrollRef.current;
    if (!scrollEl) return;

    const activeLink = scrollEl.querySelector<HTMLElement>('[data-rubric-active="true"]');
    const scrollBehavior = isNativeCapacitorFromUserAgent() ? 'auto' : 'smooth';
    activeLink?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: scrollBehavior });
  }, [pathname]);

  const showChrome = !isPinned || headerVisible || menuOpen || menuMounted;

  return (
    <>
      {chrome.headerUtilityBarEnabled ? (
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
            {utilityLinks.length > 0 ? (
              <nav className="flex items-center gap-5">
                {utilityLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={link.href}
                    className="text-white/80 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
      ) : null}

      <div ref={sentinelRef} className="h-px w-full" aria-hidden />

      <div
        className={cn(
          // sticky (pas fixed+spacer) : évite la bande vide sous le menu sur mobile / APK.
          'sticky top-0 z-50 w-full border-b border-border bg-background supports-[backdrop-filter]:bg-background/95 supports-[backdrop-filter]:backdrop-blur-sm',
          'max-md:will-change-transform max-md:transition-[transform,opacity,box-shadow] max-md:duration-[380ms] max-md:ease-[cubic-bezier(0.22,1,0.36,1)]',
          'md:transition-[box-shadow] md:duration-300 md:ease-out',
          isPinned && 'shadow-md',
          isPinned && !showChrome && 'max-md:-translate-y-full max-md:opacity-0 max-md:pointer-events-none',
          isPinned && showChrome && 'max-md:translate-y-0 max-md:opacity-100'
        )}
      >
        <header className="w-full">
          <div className="container relative mx-auto flex h-14 items-center justify-between gap-2 px-3 md:h-[4.5rem] md:gap-4 md:px-4">
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

              {chrome.headerSearchEnabled ? (
                <HeaderSearch
                  className="min-w-0"
                  showMobileTrigger={chrome.mobileHeaderSearchEnabled}
                  showDesktopTrigger
                />
              ) : null}
            </div>

            <Link
              href="/"
              className="group absolute left-1/2 top-1/2 z-0 flex -translate-x-1/2 -translate-y-1/2 items-center"
              aria-label={`${siteConfig.name} — Accueil`}
            >
              <SiteLogo className="h-10 w-auto transition-opacity group-hover:opacity-90 md:h-16" />
            </Link>

            <div className="z-10 flex flex-1 items-center justify-end gap-0.5 md:gap-2">
              {showSubscribeDesktop ? (
                <Link
                  href="/soutenir"
                  className="hidden items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/15 md:inline-flex"
                >
                  {subscribeLabel}
                </Link>
              ) : null}
              {showSubscribeMobile ? (
                <Link
                  href="/soutenir"
                  className="inline-flex items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15 md:hidden"
                >
                  {subscribeLabel}
                </Link>
              ) : null}
              {chrome.headerPushAlertsEnabled ? (
                <div className="flex items-center md:hidden">
                  <PushAlertsIconButton />
                </div>
              ) : null}
              {chrome.headerThemeToggleEnabled ? (
                <ThemeToggle className="hidden md:inline-flex" />
              ) : null}
              <Link
                href="/compte"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
                aria-label="Compte lecteur"
                title="Compte lecteur"
              >
                <UserRound className="h-5 w-5" />
              </Link>
              {chrome.headerAuthLinkEnabled ? (
                <HeaderAuthLink className="hidden md:inline-flex" />
              ) : null}
              {chrome.headerTvButtonEnabled ? (
                <Link
                  href="/tv"
                  className="hidden h-auto w-auto items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 md:inline-flex"
                  aria-label="Wab-infos TV"
                >
                  <Tv className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-bold uppercase tracking-wider">Wab-infos TV</span>
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <nav className="border-t border-border/70 bg-background lg:hidden" aria-label="Rubriques">
          <div
            ref={rubricsScrollRef}
            className="flex flex-nowrap items-center gap-0 overflow-x-auto overflow-y-hidden px-1 py-0 scrollbar-none touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch] sm:px-2"
          >
            <Link
              href="/"
              data-rubric-active={pathname === '/' ? 'true' : undefined}
              className={cn(
                'shrink-0 border-b-2 px-3.5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors',
                pathname === '/'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground/75'
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
                  'shrink-0 border-b-2 px-3.5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors',
                  isActive(cat.slug)
                    ? 'border-primary text-primary'
                    : 'border-transparent text-foreground/75'
                )}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      <nav className="hidden border-b border-border bg-background lg:block" aria-label="Rubriques">
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

      {menuMounted && (
        <>
          <button
            type="button"
            className={cn(
              'fixed inset-0 z-[60] bg-black/50 backdrop-blur-[1px]',
              menuLeaving ? 'mobile-menu-backdrop-leave' : 'mobile-menu-backdrop-enter'
            )}
            onClick={() => setMenuOpen(false)}
            aria-label="Fermer le menu"
          />
          <aside
            className={cn(
              'fixed inset-y-0 left-0 z-[70] flex w-full max-w-sm flex-col bg-card shadow-2xl pt-[env(safe-area-inset-top)] sm:max-w-md',
              menuLeaving ? 'mobile-menu-panel-leave' : 'mobile-menu-panel-enter'
            )}
            aria-label="Navigation principale"
          >
            {settingsOpen ? (
              <MobileSiteSettings open onClose={() => setSettingsOpen(false)} />
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-border px-4 py-4">
                  <span className="text-sm font-bold uppercase tracking-widest text-foreground">
                    Menu
                  </span>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Fermer le menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <MobileMenuToolbar
                  className="md:hidden"
                  onNavigate={() => setMenuOpen(false)}
                  onOpenSettings={() => setSettingsOpen(true)}
                />

                {chrome.headerSearchEnabled && chrome.mobileMenuSearchEnabled ? (
                  <div className="border-b border-border px-4 py-4 md:hidden">
                    <HeaderSearch compact onSubmit={() => setMenuOpen(false)} />
                  </div>
                ) : null}

                <div className="flex-1 overflow-y-auto">
                  <section className="border-b border-border pb-2">
                    <h2 className="px-5 pb-2 pt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Rubriques
                    </h2>
                    <ul>
                      <li>
                        <Link
                          href="/"
                          className={cn(
                            'group flex items-center justify-between gap-3 border-l-4 px-5 py-3.5 transition-colors',
                            pathname === '/'
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-transparent hover:bg-muted/60'
                          )}
                          onClick={() => setMenuOpen(false)}
                        >
                          <span className="text-[15px] font-bold uppercase tracking-[0.06em]">
                            À la une
                          </span>
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5',
                              pathname === '/' && 'text-primary'
                            )}
                          />
                        </Link>
                      </li>
                      {mainNavCategories.map((cat) => {
                        const active = isActive(cat.slug);
                        return (
                          <li key={cat.slug} className="border-t border-border/60">
                            <Link
                              href={`/${cat.slug}`}
                              className={cn(
                                'group flex items-center justify-between gap-3 border-l-4 px-5 py-3.5 transition-colors',
                                active ? 'bg-muted/50' : 'hover:bg-muted/60'
                              )}
                              style={{
                                borderLeftColor: active ? cat.color : 'transparent',
                              }}
                              onClick={() => setMenuOpen(false)}
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: cat.color }}
                                  aria-hidden
                                />
                                <span
                                  className={cn(
                                    'truncate text-[15px] font-bold uppercase tracking-[0.06em]',
                                    active ? 'text-foreground' : 'text-foreground/90'
                                  )}
                                >
                                  {cat.name}
                                </span>
                              </span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>

                  {showSubscribeMobile || serviceLinks.length > 0 ? (
                    <section className="border-b border-border px-5 py-5">
                      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Services
                      </h2>
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        {showSubscribeMobile ? (
                          <Link
                            href="/soutenir"
                            onClick={() => setMenuOpen(false)}
                            className="flex flex-col items-start gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-3.5 py-3.5 transition-colors hover:bg-primary/15"
                          >
                            <HeartHandshake className="h-5 w-5 text-primary" aria-hidden />
                            <span className="text-sm font-bold text-primary">{subscribeLabel}</span>
                            <span className="text-[11px] leading-snug text-primary/80">
                              Soutenir dès 1 $
                            </span>
                          </Link>
                        ) : null}
                        <Link
                          href="/compte"
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            'flex flex-col items-start gap-2 rounded-2xl border border-border bg-muted/40 px-3.5 py-3.5 transition-colors hover:bg-muted',
                            !showSubscribeMobile && 'col-span-2'
                          )}
                        >
                          <UserRound className="h-5 w-5 text-foreground" aria-hidden />
                          <span className="text-sm font-bold text-foreground">Compte lecteur</span>
                          <span className="text-[11px] leading-snug text-muted-foreground">
                            Connexion & préférences
                          </span>
                        </Link>
                      </div>
                      {serviceLinks.length > 0 ? (
                        <ul className="space-y-1">
                          {serviceLinks.map((link) => (
                            <li key={link.id}>
                              <Link
                                href={link.href}
                                className="block rounded-lg px-2 py-2.5 transition-colors hover:bg-muted"
                                onClick={() => setMenuOpen(false)}
                              >
                                <span className="text-sm font-semibold">{link.label}</span>
                                {link.description ? (
                                  <span className="mt-0.5 block text-xs text-muted-foreground">
                                    {link.description}
                                  </span>
                                ) : null}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </section>
                  ) : (
                    <section className="border-b border-border px-5 py-5">
                      <Link
                        href="/compte"
                        onClick={() => setMenuOpen(false)}
                        className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-muted/40 px-3.5 py-3.5 transition-colors hover:bg-muted"
                      >
                        <UserRound className="h-5 w-5 text-foreground" aria-hidden />
                        <span className="text-sm font-bold text-foreground">Compte lecteur</span>
                        <span className="text-[11px] leading-snug text-muted-foreground">
                          Connexion & préférences
                        </span>
                      </Link>
                    </section>
                  )}

                  {infoLinks.length > 0 ? (
                    <section className="px-5 py-5">
                      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Wab-infos
                      </h2>
                      <ul className="space-y-1">
                        {infoLinks.map((link) => (
                          <li key={link.id}>
                            <Link
                              href={link.href}
                              className="block rounded-lg px-2 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                              onClick={() => setMenuOpen(false)}
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  <section className="border-t border-border px-5 py-5 md:hidden">
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3.5 text-left transition-colors hover:bg-muted"
                    >
                      <span>
                        <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          Préférences
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-foreground">
                          Langue, alertes, newsletter
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </section>
                </div>

                <MobileMenuFooterCta
                  action={chrome.mobileMenuFooterAction}
                  playStoreUrl={chrome.mobileMenuPlayStoreUrl}
                  onNavigate={() => setMenuOpen(false)}
                />

                {chrome.mobileMenuShowAppVersion ? (
                  <MobileMenuAppVersion />
                ) : null}
              </>
            )}
          </aside>
        </>
      )}
    </>
  );
}
