'use client';

import Link from 'next/link';
import { LayoutDashboard, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

const redactionUrl = process.env.NEXT_PUBLIC_REDACTION_URL || 'http://localhost:3001';

interface HeaderAuthLinkProps {
  className?: string;
  onNavigate?: () => void;
  variant?: 'inline' | 'button' | 'icon' | 'labeled';
}

export function HeaderAuthLink({ className, onNavigate, variant = 'inline' }: HeaderAuthLinkProps) {
  const iconOnlyClass =
    'inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted';

  const labeledClass =
    'flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-1.5 text-foreground transition-colors hover:bg-muted';

  return (
    <Link
      href={redactionUrl}
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
      aria-label="Espace rédaction"
      title="Espace rédaction"
    >
      {variant === 'labeled' ? (
        <>
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-semibold leading-none">Rédaction</span>
        </>
      ) : (
        <>
          <LogIn className="h-5 w-5" />
          {variant !== 'icon' && 'Rédaction'}
        </>
      )}
    </Link>
  );
}
