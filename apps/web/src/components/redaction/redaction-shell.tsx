'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, Home, LogOut, PenLine, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/redaction', label: 'Accueil', icon: Home, exact: true },
  { href: '/redaction/articles', label: 'Articles', icon: FileText },
  { href: '/redaction/nouveau', label: 'Écrire', icon: PenLine },
  { href: '/redaction/stats', label: 'Stats', icon: BarChart3 },
] as const;

interface RedactionShellProps {
  children: React.ReactNode;
  authorName?: string;
}

export function RedactionShell({ children, authorName }: RedactionShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/redaction/auth/logout', { method: 'POST' });
    router.replace('/redaction/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              Rédaction
            </p>
            <p className="font-display text-sm font-bold">{authorName ?? 'Wab-infos'}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Déconnexion"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-28">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-2">
          {NAV.map(({ href, label, icon: Icon, ...rest }) => {
            const exact = 'exact' in rest && rest.exact;
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-semibold transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
