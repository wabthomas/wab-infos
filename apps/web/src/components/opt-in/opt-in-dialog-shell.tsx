'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptInDialogShellProps {
  open: boolean;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function OptInDialogShell({
  open,
  titleId,
  onClose,
  children,
  className,
}: OptInDialogShellProps) {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setLeaving(false);
      return;
    }
    if (!mounted) return;
    setLeaving(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setLeaving(false);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted || leaving) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, leaving, onClose]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-black/55 backdrop-blur-[3px]',
          leaving ? 'opt-in-backdrop-leave' : 'opt-in-backdrop-enter'
        )}
        aria-label="Fermer"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative z-10 w-full max-w-md overflow-hidden rounded-t-[1.75rem] border border-border/80 bg-card shadow-2xl sm:rounded-3xl',
          leaving ? 'opt-in-dialog-leave' : 'opt-in-dialog-enter',
          className
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent"
          aria-hidden
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative px-5 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">{children}</div>
      </div>
    </div>
  );
}

interface OptInActionsProps {
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  primaryIcon?: ReactNode;
  className?: string;
}

export function OptInActions({
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  primaryLoading = false,
  primaryDisabled = false,
  primaryIcon,
  className,
}: OptInActionsProps) {
  return (
    <div className={cn('mt-6 grid grid-cols-2 gap-2.5', className)}>
      <button
        type="button"
        onClick={onSecondary}
        className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-[transform,background-color,border-color] duration-200 hover:bg-muted active:scale-[0.98]"
      >
        {secondaryLabel}
      </button>
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled || primaryLoading}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-[transform,background-color,box-shadow] duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.98] disabled:opacity-60"
      >
        {primaryLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
        ) : (
          primaryIcon
        )}
        {primaryLabel}
      </button>
    </div>
  );
}
