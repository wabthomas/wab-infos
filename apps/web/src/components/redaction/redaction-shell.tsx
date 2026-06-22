'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Home, LogOut, MessageSquare, PenLine, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/redaction', label: 'Accueil', icon: Home, exact: true },
  { href: '/redaction/articles', label: 'Articles', icon: FileText },
  { href: '/redaction/nouveau', label: 'Écrire', icon: PenLine },
  { href: '/redaction/comments', label: 'Comms', icon: MessageSquare, badge: true },
  { href: '/redaction/stats', label: 'Stats', icon: BarChart3 },
] as const;

function isWritingPage(pathname: string): boolean {
  return pathname === '/redaction/nouveau' || /\/redaction\/articles\/[^/]+\/edit$/.test(pathname);
}

function writingPageTitle(pathname: string): string {
  if (pathname === '/redaction/nouveau') return 'Nouvel article';
  if (/\/edit$/.test(pathname)) return 'Modifier l\'article';
  return 'Rédaction';
}

interface RedactionShellProps {
  children: React.ReactNode;
  authorName?: string;
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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          {writing ? (
            <>
              <Link
                href="/redaction/articles"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Retour aux articles"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <p className="min-w-0 flex-1 truncate text-center font-display text-sm font-bold">
                {writingPageTitle(pathname)}
              </p>
            </>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                Rédaction
              </p>
              <p className="truncate font-display text-sm font-bold">{authorName ?? 'Wab-infos'}</p>
            </div>
          )}
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

      <main
        className={cn(
          'mx-auto w-full max-w-lg flex-1 px-4 py-4',
          writing ? 'pb-6' : 'pb-28'
        )}
      >
        {children}
      </main>

      {!writing && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1 py-2">
            {NAV.map(({ href, label, icon: Icon, ...rest }) => {
              const exact = 'exact' in rest && rest.exact;
              const showBadge = 'badge' in rest && rest.badge;
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[9px] font-semibold transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                  {showBadge && pendingComments > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                      {pendingComments > 9 ? '9+' : pendingComments}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
