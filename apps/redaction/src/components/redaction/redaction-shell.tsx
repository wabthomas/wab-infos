'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  FileText,
  Home,
  MessageSquare,
  PenLine,
  Settings,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RedactionPushBanner } from '@/components/redaction/redaction-push-setup';
import { touchRedactionSession } from '@/lib/redaction/touch-session';

const NAV_ITEMS = [
  { href: '/', label: 'Accueil', icon: Home, exact: true },
  { href: '/articles', label: 'Articles', icon: FileText },
  { href: '/comments', label: 'Commentaires', icon: MessageSquare, badge: true },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/profil', label: 'Profil', icon: User },
] as const;

function isWritingPage(pathname: string): boolean {
  return pathname === '/nouveau' || /\/articles\/[^/]+\/edit$/.test(pathname);
}

function isNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getDesktopPageTitle(pathname: string): string {
  if (pathname === '/') return 'Tableau de bord';
  if (pathname === '/articles' || pathname.startsWith('/articles/')) return 'Articles';
  if (pathname === '/comments') return 'Commentaires';
  if (pathname === '/stats') return 'Statistiques';
  if (pathname === '/profil') return 'Profil';
  if (pathname === '/parametres') return 'Paramètres du site';
  if (pathname === '/nouveau') return 'Nouvel article';
  return 'Rédaction';
}

interface RedactionShellProps {
  children: React.ReactNode;
  authorName?: string;
  isSuperAdmin?: boolean;
}

function MobileNavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
  pendingComments,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  badge?: boolean;
  pendingComments?: number;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="max-w-full truncate text-center text-[10px] font-semibold leading-none">
        {label}
      </span>
      {badge && (pendingComments ?? 0) > 0 && (
        <span className="absolute right-0 top-0 flex h-4 min-w-4 -translate-y-0.5 translate-x-0.5 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
          {(pendingComments ?? 0) > 9 ? '9+' : pendingComments}
        </span>
      )}
    </Link>
  );
}

function SidebarNavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
  pendingComments,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  badge?: boolean;
  pendingComments?: number;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', active && 'text-primary')} />
      <span className="flex-1 truncate">{label}</span>
      {badge && (pendingComments ?? 0) > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
          {(pendingComments ?? 0) > 99 ? '99+' : pendingComments}
        </span>
      ) : null}
      {active ? (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      ) : null}
    </Link>
  );
}

export function RedactionShell({ children, authorName, isSuperAdmin = false }: RedactionShellProps) {
  const pathname = usePathname();
  const writing = isWritingPage(pathname);
  const [pendingComments, setPendingComments] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadCount = () => {
      fetch('/api/redaction/comments/count')
        .then((r) => r.json())
        .then((d: { count?: number }) => {
          if (!cancelled) setPendingComments(d.count ?? 0);
        })
        .catch(() => undefined);
    };

    loadCount();
    const interval = window.setInterval(loadCount, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    void touchRedactionSession();
    const interval = window.setInterval(() => void touchRedactionSession(), 10 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void touchRedactionSession();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (writing) {
    return <div className="fixed inset-0 z-50 bg-background">{children}</div>;
  }

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-background">
      {/* Sidebar desktop */}
      <aside className="redaction-sidebar hidden w-[260px] shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border px-5 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Wab-infos</p>
          <p className="mt-0.5 font-display text-lg font-bold leading-tight">Rédaction</p>
          <p className="mt-1.5 truncate text-sm text-muted-foreground">{authorName ?? 'Éditeur'}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {NAV_ITEMS.map(({ href, label, icon, ...rest }) => (
            <SidebarNavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={isNavActive(pathname, href, 'exact' in rest && rest.exact)}
              badge={'badge' in rest && rest.badge}
              pendingComments={pendingComments}
            />
          ))}
          {isSuperAdmin ? (
            <SidebarNavItem
              href="/parametres"
              label="Paramètres"
              icon={Settings}
              active={pathname === '/parametres'}
            />
          ) : null}
        </nav>

        <div className="border-t border-border p-4">
          <Link
            href="/nouveau"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-transform hover:brightness-105 active:scale-[0.98]"
          >
            <PenLine className="h-4 w-4" />
            Nouvel article
          </Link>
        </div>
      </aside>

      {/* Zone principale */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-40 shrink-0 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
          <div className="mx-auto max-w-lg">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Rédaction</p>
            <p className="truncate font-display text-sm font-bold">{authorName ?? 'Wab-infos'}</p>
          </div>
        </header>

        <header className="hidden shrink-0 border-b border-border bg-card/80 px-8 py-4 backdrop-blur lg:block">
          <p className="font-display text-xl font-bold">{getDesktopPageTitle(pathname)}</p>
        </header>

        <main
          id="redaction-main-scroll"
          className="redaction-main-scroll mx-auto w-full min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] lg:max-w-6xl lg:px-8 lg:py-8 lg:pb-8"
        >
          <RedactionPushBanner />
          {children}
        </main>

        {isSuperAdmin ? (
          <Link
            href="/parametres"
            className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg lg:hidden"
            aria-label="Paramètres du site"
          >
            <Settings className="h-5 w-5" />
          </Link>
        ) : null}

        <Link
          href="/nouveau"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 lg:hidden"
          aria-label="Écrire un article"
        >
          <PenLine className="h-6 w-6" />
        </Link>

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[max(0.35rem,env(safe-area-inset-bottom))] lg:hidden">
          <div className="mx-auto flex max-w-lg items-end gap-0.5 px-2 pt-2">
            {NAV_ITEMS.map(({ href, label, icon, ...rest }) => (
              <MobileNavItem
                key={href}
                href={href}
                label={label}
                icon={icon}
                active={isNavActive(pathname, href, 'exact' in rest && rest.exact)}
                badge={'badge' in rest && rest.badge}
                pendingComments={pendingComments}
              />
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
