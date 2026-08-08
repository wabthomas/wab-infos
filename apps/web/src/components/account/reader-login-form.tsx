'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeartHandshake, LogIn, UserRound } from 'lucide-react';
import {
  loginReaderAccount,
  readReaderAccount,
  type ReaderAccount,
} from '@/lib/reader-account';
import { writeUserPreferences, readUserPreferences } from '@/lib/user-preferences';
import { cn } from '@/lib/utils';

export function ReaderLoginForm({
  className,
  redirectTo = '/compte',
}: {
  className?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<ReaderAccount | null>(null);

  useEffect(() => {
    const account = readReaderAccount();
    setExisting(account);
    if (account) {
      setEmail(account.email);
      setDisplayName(account.displayName);
    } else {
      const prefs = readUserPreferences();
      if (prefs.newsletterEmail) setEmail(prefs.newsletterEmail);
    }
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = loginReaderAccount({ email, displayName });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const prefs = readUserPreferences();
    writeUserPreferences({
      ...prefs,
      newsletterEmail: result.account.email,
    });
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className={cn('mx-auto w-full max-w-md space-y-4', className)}>
      {existing ? (
        <p className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Connecté en tant que{' '}
          <strong className="text-foreground">{existing.displayName}</strong>.{' '}
          <Link
            href="/compte"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Voir mon compte
          </Link>
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-3xl border border-border/80 bg-card/90 p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 sm:p-6"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserRound className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold text-foreground">Compte lecteur</h2>
            <p className="text-sm text-muted-foreground">
              Sans mot de passe — nom et e-mail suffisent.
            </p>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Nom d’affichage
          </span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoComplete="name"
            placeholder="Ex. Jean K."
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            E-mail
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="vous@exemple.com"
            className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </label>

        {error ? (
          <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <LogIn className="h-4 w-4" aria-hidden />
          {existing ? 'Mettre à jour' : 'Se connecter'}
        </button>

        <Link
          href="/soutenir"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border text-sm font-semibold hover:bg-muted"
        >
          <HeartHandshake className="h-4 w-4" aria-hidden />
          Soutenir sans compte
        </Link>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Compte local sur cet appareil. L’espace <strong className="text-foreground">Rédaction</strong>{' '}
          est réservé aux journalistes.
        </p>
      </form>
    </div>
  );
}
