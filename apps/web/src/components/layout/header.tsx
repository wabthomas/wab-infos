'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, Search, Tv, X } from 'lucide-react';
import { categories, siteConfig } from '@/config/site';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (slug: string) => pathname === `/${slug}` || pathname.startsWith(`/${slug}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="bg-[var(--gradient-hero)]">
        <div className="container mx-auto flex items-center justify-between px-4 py-1.5 text-xs text-white/90">
          <span className="font-medium">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
          <div className="hidden items-center gap-5 md:flex">
            <Link href="/tv" className="flex items-center gap-1.5 transition-opacity hover:opacity-80">
              <Tv className="h-3.5 w-3.5" />
              Wab-infos TV
            </Link>
            <Link href="/recherche" className="transition-opacity hover:opacity-80">
              Recherche
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex h-[4.25rem] items-center justify-between">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-primary shadow-md transition-transform group-hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              <span className="relative font-display text-xl font-bold text-primary-foreground">W</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-display text-2xl font-bold tracking-tight">{siteConfig.name}</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                L&apos;info en continu
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex">
            {categories.slice(0, 7).map((cat) => (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className={cn(
                  'relative rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                  isActive(cat.slug)
                    ? 'text-primary'
                    : 'text-foreground/75 hover:bg-muted hover:text-foreground'
                )}
              >
                {cat.name}
                {isActive(cat.slug) && (
                  <span
                    className="absolute bottom-0 left-2.5 right-2.5 h-0.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                )}
              </Link>
            ))}
            <Link
              href="/tv"
              className={cn(
                'ml-1 flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors',
                pathname === '/tv'
                  ? 'bg-primary/10 text-primary'
                  : 'text-primary hover:bg-primary/5'
              )}
            >
              <Tv className="h-3.5 w-3.5" />
              TV
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/recherche"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground/80 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted hover:text-primary"
              aria-label="Rechercher"
            >
              <Search className="h-4 w-4" />
            </Link>
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card shadow-sm transition-colors hover:bg-muted lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'border-t border-border bg-card/95 backdrop-blur-sm lg:hidden',
          mobileOpen ? 'block' : 'hidden'
        )}
      >
        <nav className="container mx-auto grid gap-0.5 px-4 py-3">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/${cat.slug}`}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive(cat.slug) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              )}
              onClick={() => setMobileOpen(false)}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
              {cat.name}
            </Link>
          ))}
          <Link
            href="/tv"
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5"
            onClick={() => setMobileOpen(false)}
          >
            <Tv className="h-4 w-4" />
            Wab-infos TV
          </Link>
        </nav>
      </div>
    </header>
  );
}
