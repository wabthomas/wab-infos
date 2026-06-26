'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutDashboard, Loader2, LogIn } from 'lucide-react';
import { isNativeCapacitorApp, navigateInApp, resolveRedactionUrl } from '@wab-infos/shared';
import { cn } from '@/lib/utils';

const redactionBase = resolveRedactionUrl(process.env.NEXT_PUBLIC_REDACTION_URL).replace(/\/$/, '');
const redactionLoginUrl = `${redactionBase}/login`;

interface HeaderAuthLinkProps {
  className?: string;
  onNavigate?: () => void;
  variant?: 'inline' | 'button' | 'icon' | 'labeled';
}

export function HeaderAuthLink({ className, onNavigate, variant = 'inline' }: HeaderAuthLinkProps) {
  const [nativeApp, setNativeApp] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    void isNativeCapacitorApp().then(setNativeApp);
  }, []);

  useEffect(() => {
    if (!navigating) return;
    const reset = () => setNavigating(false);
    window.addEventListener('pageshow', reset);
    window.addEventListener('pagehide', reset);
    const timeout = window.setTimeout(reset, 15000);
    return () => {
      window.removeEventListener('pageshow', reset);
      window.removeEventListener('pagehide', reset);
      window.clearTimeout(timeout);
    };
  }, [navigating]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      onNavigate?.();
      setNavigating(true);
      if (nativeApp) {
        e.preventDefault();
        void navigateInApp(redactionLoginUrl);
      }
    },
    [nativeApp, onNavigate]
  );

  const iconOnlyClass =
    'inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted';

  const labeledClass =
    'flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-1.5 text-foreground transition-colors hover:bg-muted';

  return (
    <a
      href={redactionLoginUrl}
      className={cn(
        variant === 'labeled'
          ? labeledClass
          : variant === 'icon'
            ? iconOnlyClass
            : variant === 'button'
              ? 'inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted'
              : 'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted',
        navigating && 'pointer-events-none opacity-70',
        className
      )}
      onClick={handleClick}
      aria-label="Espace rédaction"
      aria-busy={navigating}
      title="Espace rédaction"
    >
      {navigating ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      ) : variant === 'labeled' ? (
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
    </a>
  );
}
