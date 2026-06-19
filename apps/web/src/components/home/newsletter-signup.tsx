'use client';

import { FormEvent, useState } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

interface NewsletterSignupProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function NewsletterSignup({ className, variant = 'default' }: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();

    if (!trimmed) {
      setStatus('error');
      setMessage('Veuillez saisir votre adresse e-mail.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue.');
      }

      setStatus('success');
      setMessage(data.message || 'Merci ! Vous êtes inscrit à la newsletter.');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Impossible de finaliser l\'inscription.');
    }
  }

  const isCompact = variant === 'compact';
  const inputId = isCompact ? 'newsletter-email-sidebar' : 'newsletter-email';
  const headingId = isCompact ? 'newsletter-sidebar-heading' : 'newsletter-heading';

  return (
    <section
      id={isCompact ? undefined : 'newsletter'}
      className={cn(
        'widget-card overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card',
        !isCompact && 'scroll-mt-28',
        className
      )}
      aria-labelledby={headingId}
    >
      <div className={cn('border-b border-border/80 bg-primary/[0.08]', isCompact ? 'px-3 py-3' : 'px-4 py-4')}>
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm',
              isCompact ? 'h-8 w-8' : 'h-10 w-10'
            )}
          >
            <Mail className={isCompact ? 'h-4 w-4' : 'h-5 w-5'} />
          </span>
          <div>
            <h3 id={headingId} className="text-xs font-bold uppercase tracking-widest">
              Newsletter
            </h3>
            <p className={cn('leading-relaxed text-muted-foreground', isCompact ? 'mt-0.5 text-xs' : 'mt-1 text-sm')}>
              {isCompact
                ? 'L\'essentiel de l\'actu, chaque matin.'
                : 'Recevez chaque matin l\'essentiel de l\'actualité congolaise et africaine.'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={cn('space-y-2.5', isCompact ? 'p-3' : 'space-y-3 p-4')}>
        <label htmlFor={inputId} className="sr-only">
          Adresse e-mail
        </label>
        <input
          id={inputId}
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status === 'error') setStatus('idle');
          }}
          placeholder="votre@email.com"
          disabled={status === 'loading' || status === 'success'}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          S&apos;abonner
        </button>

        {message && (
          <p
            role="status"
            className={cn(
              'text-xs',
              status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
            )}
          >
            {message}
          </p>
        )}

        {!isCompact && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            En vous inscrivant, vous acceptez de recevoir nos e-mails. Désinscription possible à tout moment.
          </p>
        )}
      </form>
    </section>
  );
}
