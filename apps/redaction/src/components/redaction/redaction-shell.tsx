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

interface RedactionShellProps {
  children: React.ReactNode;
  authorName?: string;
}

function NavItem({
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

export function RedactionShell({ children, authorName }: RedactionShellProps) {
  const pathname = usePathname();
  const writing = isWritingPage(pathname);
  const [pendingComments, setPendingComments] = useState(0);

  useEffect(() => {
    fetch('/api/redaction/comments/count')
      .then((r) => r.json())
      .then((d: { count?: number }) => setPendingComments(d.count ?? 0))
      .catch(() => undefined);
  }, [pathname]);

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
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-lg">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Rédaction</p>
          <p className="truncate font-display text-sm font-bold">{authorName ?? 'Wab-infos'}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <RedactionPushBanner />
        {children}
      </main>

      <Link
        href="/nouveau"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
        aria-label="Écrire un article"
      >
        <PenLine className="h-6 w-6" />
      </Link>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[max(0.35rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg items-end gap-0.5 px-2 pt-2">
          {NAV_ITEMS.map(({ href, label, icon, ...rest }) => (
            <NavItem
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
  );
}
