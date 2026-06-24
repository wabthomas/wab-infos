'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LayoutDashboard, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderAuthLinkProps {
  className?: string;
  onNavigate?: () => void;
  variant?: 'inline' | 'button' | 'icon' | 'labeled';
}

export function HeaderAuthLink({ className, onNavigate, variant = 'inline' }: HeaderAuthLinkProps) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/redaction/auth/me', { credentials: 'same-origin' })
      .then((res) => {
        if (!cancelled) setLoggedIn(res.ok);
      })
      .catch(() => {
        if (!cancelled) setLoggedIn(false);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) {
    return (
      <span
        className={cn(
          'inline-block h-9 w-24 animate-pulse rounded-md bg-muted',
          variant === 'button' && 'h-11 w-full',
          variant === 'icon' && 'h-10 w-10',
          variant === 'labeled' && 'h-14 w-full',
          className
        )}
        aria-hidden
      />
    );
  }

  const iconOnlyClass =
    'inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted';

  const labeledClass =
    'flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-1.5 text-foreground transition-colors hover:bg-muted';

  if (loggedIn) {
    return (
      <Link
        href="/redaction"
        className={cn(
          variant === 'labeled'
            ? labeledClass
            : variant === 'icon'
              ? iconOnlyClass
              : variant === 'button'
                ? 'inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90'
                : 'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted',
          className
        )}
        onClick={onNavigate}
        aria-label="Espace rédaction"
        title="Espace rédaction"
      >
        <LayoutDashboard className="h-5 w-5" />
        {variant === 'labeled' ? (
          <span className="text-[10px] font-semibold leading-none">Rédaction</span>
        ) : (
          variant !== 'icon' && 'Rédaction'
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/redaction/login"
      className={cn(
        variant === 'labeled'
          ? labeledClass
          : variant === 'icon'
            ? iconOnlyClass
            : variant === 'button'
              ? 'inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted'
              : 'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted',
        className
      )}
      onClick={onNavigate}
      aria-label="Se connecter"
      title="Se connecter"
    >
      <LogIn className="h-5 w-5" />
      {variant === 'labeled' ? (
        <span className="text-[10px] font-semibold leading-none">Connexion</span>
      ) : (
        variant !== 'icon' && 'Se connecter'
      )}
    </Link>
  );
}
