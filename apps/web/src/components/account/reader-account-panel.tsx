'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HeartHandshake, LogOut, Mail, Pencil, UserRound } from 'lucide-react';
import {
  clearReaderAccount,
  readReaderAccount,
  subscribeToReaderAccount,
  type ReaderAccount,
} from '@/lib/reader-account';
import { cn } from '@/lib/utils';

export function ReaderAccountPanel({ className }: { className?: string }) {
  const [account, setAccount] = useState<ReaderAccount | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAccount(readReaderAccount());
    setReady(true);
    return subscribeToReaderAccount(setAccount);
  }, []);

  if (!ready) {
    return (
      <div
        className={cn(
          'mx-auto max-w-lg animate-pulse rounded-3xl border border-border bg-muted/30 p-10',
          className
        )}
      />
    );
  }

  if (!account) {
    return (
      <div
        className={cn(
          'mx-auto max-w-lg space-y-5 rounded-3xl border border-border/80 bg-card/90 p-6 text-center shadow-sm ring-1 ring-black/5 dark:ring-white/10',
          className
        )}
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserRound className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold text-foreground">Pas encore connecté</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Créez un compte lecteur pour retrouver vos préférences et soutenir Wab-infos.
          </p>
        </div>
        <Link
          href="/connexion"
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          Se connecter
        </Link>
        <Link
          href="/soutenir"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border text-sm font-semibold hover:bg-muted"
        >
          <HeartHandshake className="h-4 w-4" aria-hidden />
          Soutenir le média
        </Link>
      </div>
    );
  }

  return (
    <div className={cn('mx-auto max-w-lg space-y-4', className)}>
      <div className="rounded-3xl border border-border/80 bg-card/90 p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserRound className="h-7 w-7" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Compte lecteur
            </p>
            <h2 className="mt-1 truncate text-2xl font-bold text-foreground">
              {account.displayName}
            </h2>
            <p className="mt-2 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {account.email}
            </p>
          </div>
        </div>
      </div>

      <Link
        href="/soutenir"
        className="flex items-center gap-3 rounded-3xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-4 transition-colors hover:bg-emerald-500/10"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
          <HeartHandshake className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-bold text-foreground">Soutenir Wab-infos</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Mobile Money, carte ou USDT — à partir de 1 $.
          </span>
        </span>
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/connexion"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border px-3 text-sm font-semibold hover:bg-muted"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Modifier
        </Link>
        <button
          type="button"
          onClick={() => {
            clearReaderAccount();
            setAccount(null);
          }}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Déconnexion
        </button>
      </div>
    </div>
  );
}
