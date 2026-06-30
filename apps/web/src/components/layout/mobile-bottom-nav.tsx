'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Menu, Newspaper, Play, Radio } from 'lucide-react';
import { isArticlePagePath } from '@/config/site';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
  menuOpen?: boolean;
}

const items = [
  {
    id: 'home',
    label: 'Accueil',
    href: '/',
    icon: Home,
    isActive: (pathname: string) => pathname === '/',
  },
  {
    id: 'news',
    label: 'Actualités',
    href: '/actualite',
    icon: Newspaper,
    isActive: (pathname: string) =>
      pathname === '/actualite' || pathname.startsWith('/actualite/'),
  },
  {
    id: 'replays',
    label: 'Replays',
    href: '/tv?tab=replay',
    icon: Play,
    isActive: (pathname: string, tab: string | null) =>
      pathname === '/tv' && tab === 'replay',
  },
  {
    id: 'live',
    label: 'Direct TV',
    href: '/tv?tab=live',
    icon: Radio,
    isActive: (pathname: string, tab: string | null) =>
      pathname === '/tv' && (tab === 'live' || !tab),
  },
] as const;

export function MobileBottomNav({ onOpenMenu, menuOpen = false }: MobileBottomNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  if (isArticlePagePath(pathname)) {
    return null;
  }

  return (
    <nav
      className="native-safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_-4px_rgb(0_0_0/0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-background/90 md:hidden"
      aria-label="Navigation principale mobile"
    >
      <ul className="mx-auto grid h-[3.75rem] max-w-lg grid-cols-5">
        {items.map(({ id, label, href, icon: Icon, isActive }) => {
          const active = isActive(pathname, tab);

          return (
            <li key={id}>
              <Link
                href={href}
                className={cn(
                  'relative flex h-full flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-semibold transition-colors min-[400px]:px-1 min-[400px]:text-[10px]',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  className={cn('h-5 w-5', active && id === 'live' && 'text-red-600')}
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden
                />
                <span className="leading-none">{label}</span>
                {active && (
                  <span className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.25rem)] h-0.5 w-8 rounded-full bg-primary" />
                )}
              </Link>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={() => onOpenMenu()}
            className={cn(
              'flex h-full w-full flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-semibold transition-colors min-[400px]:px-1 min-[400px]:text-[10px]',
              menuOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
            aria-expanded={menuOpen}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" strokeWidth={menuOpen ? 2.5 : 2} aria-hidden />
            <span className="leading-none">Menu</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
