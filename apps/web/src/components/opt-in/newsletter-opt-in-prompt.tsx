'use client';

import { FormEvent, useCallback, useState } from 'react';
import { Mail } from 'lucide-react';
import { OptInActions, OptInDialogShell } from '@/components/opt-in/opt-in-dialog-shell';
import { useUserPreferences } from '@/components/providers/user-preferences-provider';
import { readUserPreferences } from '@/lib/user-preferences';

export const NEWSLETTER_PROMPT_DISMISS_KEY = 'wab-newsletter-prompt-dismissed';

interface NewsletterOptInPromptProps {
  open: boolean;
  onResolved: () => void;
}

export function NewsletterOptInPrompt({ open, onResolved }: NewsletterOptInPromptProps) {
  const { preferences, setNewsletter } = useUserPreferences();
  const [email, setEmail] = useState(preferences.newsletterEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEn = preferences.language === 'en';

  const dismiss = useCallback(() => {
    localStorage.setItem(NEWSLETTER_PROMPT_DISMISS_KEY, '1');
    onResolved();
  }, [onResolved]);

  const subscribe = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();
      const trimmed = email.trim();
      if (!trimmed) {
        setError(
          isEn ? 'Please enter your email address.' : 'Veuillez saisir votre adresse e-mail.'
        );
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed }),
        });
        const data = (await response.json()) as { message?: string; error?: string };
        if (!response.ok) {
          throw new Error(data.error || (isEn ? 'Something went wrong.' : 'Une erreur est survenue.'));
        }

        setNewsletter(trimmed, true);
        localStorage.setItem(NEWSLETTER_PROMPT_DISMISS_KEY, '1');
        onResolved();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isEn
              ? 'Could not complete subscription.'
              : "Impossible de finaliser l'inscription."
        );
      } finally {
        setLoading(false);
      }
    },
    [email, isEn, onResolved, setNewsletter]
  );

  return (
    <OptInDialogShell open={open} titleId="newsletter-opt-in-title" onClose={dismiss}>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
          <Mail className="h-7 w-7" strokeWidth={2.25} />
        </span>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          Newsletter
        </p>
        <h2
          id="newsletter-opt-in-title"
          className="font-display mt-2 text-2xl font-bold tracking-tight text-foreground"
        >
          {isEn ? 'Get the daily briefing?' : 'Recevoir le brief du jour ?'}
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {isEn
            ? 'The essential headlines from Congo and Africa, straight to your inbox.'
            : 'L’essentiel de l’actualité congolaise et africaine, directement dans votre boîte mail.'}
        </p>
      </div>

      <form onSubmit={subscribe} className="mt-5 space-y-3">
        <label htmlFor="newsletter-opt-in-email" className="sr-only">
          Email
        </label>
        <input
          id="newsletter-opt-in-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (error) setError('');
          }}
          placeholder={isEn ? 'you@example.com' : 'vous@exemple.com'}
          disabled={loading}
          className="h-12 w-full rounded-2xl border border-border bg-muted/40 px-4 text-sm outline-none ring-primary/25 transition focus:border-primary focus:bg-background focus:ring-2 disabled:opacity-60"
        />

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-center text-xs text-destructive" role="status">
            {error}
          </p>
        ) : null}

        <OptInActions
          secondaryLabel={isEn ? 'Refuse' : 'Refuser'}
          primaryLabel={isEn ? 'Allow' : 'Autoriser'}
          onSecondary={dismiss}
          onPrimary={() => void subscribe()}
          primaryLoading={loading}
          primaryIcon={<Mail className="h-4 w-4" />}
          className="mt-1"
        />
      </form>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        {isEn
          ? 'Unsubscribe anytime. Also available in Menu → Settings.'
          : 'Désinscription possible à tout moment. Aussi dans Menu → Réglages.'}
      </p>
    </OptInDialogShell>
  );
}

export function shouldOfferNewsletterPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(NEWSLETTER_PROMPT_DISMISS_KEY) === '1') return false;
  const prefs = readUserPreferences();
  if (prefs.newsletterOptIn && prefs.newsletterEmail) return false;
  return true;
}
