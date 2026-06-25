'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  FileText,
  Home,
  LogOut,
  MessageSquare,
  PenLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_SIDE = [
  { href: '/redaction', label: 'Accueil', icon: Home, exact: true },
  { href: '/redaction/articles', label: 'Articles', icon: FileText },
] as const;

const NAV_SIDE_RIGHT = [
  { href: '/redaction/comments', label: 'Commentaires', icon: MessageSquare, badge: true },
  { href: '/redaction/stats', label: 'Stats', icon: BarChart3 },
] as const;

const NAV_WRITE = {
  href: '/redaction/nouveau',
  label: 'Écrire',
  icon: PenLine,
} as const;

function isWritingPage(pathname: string): boolean {
  return pathname === '/redaction/nouveau' || /\/redaction\/articles\/[^/]+\/edit$/.test(pathname);
}

function isNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  if (href === '/redaction/nouveau') {
    return pathname === href || /\/redaction\/articles\/[^/]+\/edit$/.test(pathname);
  }
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
  prominent,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  badge?: boolean;
  pendingComments?: number;
  prominent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-colors',
        prominent
          ? active
            ? '-mt-3 rounded-2xl bg-primary px-3 py-2.5 text-primary-foreground shadow-lg shadow-primary/25'
            : '-mt-3 rounded-2xl bg-primary px-3 py-2.5 text-primary-foreground shadow-md shadow-primary/20'
          : active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className={cn('shrink-0', prominent ? 'h-6 w-6' : 'h-5 w-5')} />
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
  const router = useRouter();
  const [pendingComments, setPendingComments] = useState(0);
  const writing = isWritingPage(pathname);

  useEffect(() => {
    fetch('/api/redaction/comments/count')
      .then((r) => r.json())
      .then((d: { count?: number }) => setPendingComments(d.count ?? 0))
      .catch(() => undefined);
  }, [pathname]);

  async function logout() {
    await fetch('/api/redaction/auth/logout', { method: 'POST' });
    router.replace('/redaction/login');
    router.refresh();
  }

  if (writing) {
    return <div className="min-h-[100dvh] bg-background">{children}</div>;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              Rédaction
            </p>
            <p className="truncate font-display text-sm font-bold">{authorName ?? 'Wab-infos'}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Déconnexion"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[max(0.35rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg items-end gap-0.5 px-2 pt-2">
          {NAV_SIDE.map(({ href, label, icon, ...rest }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={isNavActive(pathname, href, 'exact' in rest && rest.exact)}
            />
          ))}

          <NavItem
            href={NAV_WRITE.href}
            label={NAV_WRITE.label}
            icon={NAV_WRITE.icon}
            active={isNavActive(pathname, NAV_WRITE.href)}
            prominent
          />

          {NAV_SIDE_RIGHT.map(({ href, label, icon, ...rest }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={isNavActive(pathname, href)}
              badge={'badge' in rest && rest.badge}
              pendingComments={pendingComments}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
