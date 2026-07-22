'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Bell, BellOff, Loader2, Mail, Settings2 } from 'lucide-react';
import { useUserPreferences } from '@/components/providers/user-preferences-provider';
import { useToast } from '@/components/ui/toast';
import { subscribeToPushNotifications, syncPushSubscriptionIfGranted } from '@/lib/push/client';
import type { SiteLanguage } from '@/lib/user-preferences';
import { cn } from '@/lib/utils';

type PushUiState = 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported';

interface MobileSiteSettingsProps {
  open: boolean;
  onClose: () => void;
  className?: string;
}

const LANGUAGE_OPTIONS: { value: SiteLanguage; label: string; hint: string }[] = [
  { value: 'fr', label: 'Français', hint: 'FR' },
  { value: 'en', label: 'English', hint: 'EN' },
];

export function MobileSiteSettings({ open, onClose, className }: MobileSiteSettingsProps) {
  const { preferences, setLanguage, setPushAlertsDesired, setNewsletter } = useUserPreferences();
  const toast = useToast();
  const [pushState, setPushState] = useState<PushUiState>('idle');
  const [email, setEmail] = useState(preferences.newsletterEmail);
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );
  const [newsletterMessage, setNewsletterMessage] = useState('');

  useEffect(() => {
    setEmail(preferences.newsletterEmail);
  }, [preferences.newsletterEmail]);

  // Sync UI with browser permission once when opening — never rewrite user preference.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('Notification' in window)
    ) {
      setPushState('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setPushState('denied');
      return;
    }

    if (Notification.permission === 'granted') {
      syncPushSubscriptionIfGranted().then((ok) => {
        if (cancelled) return;
        setPushState(ok ? 'subscribed' : 'idle');
      });
    } else {
      setPushState('idle');
    }

    const onSubscribed = () => {
      if (cancelled) return;
      setPushState('subscribed');
    };
    window.addEventListener('wab-push-subscribed', onSubscribed);
    return () => {
      cancelled = true;
      window.removeEventListener('wab-push-subscribed', onSubscribed);
    };
  }, [open]);

  const enablePush = useCallback(async () => {
    if (pushState === 'unsupported' || pushState === 'denied' || pushState === 'loading') return;

    const isEn = preferences.language === 'en';
    setPushState('loading');
    setPushAlertsDesired(true);
    const result = await subscribeToPushNotifications();

    if (result.ok) {
      setPushState('subscribed');
      window.dispatchEvent(new Event('wab-push-subscribed'));
      toast.success(
        isEn ? 'Alerts enabled' : 'Alertes activées',
        isEn
          ? 'You will receive push notifications for major stories.'
          : 'Vous recevrez des notifications pour les infos majeures.'
      );
      return;
    }

    if (result.reason === 'denied') {
      setPushState('denied');
      toast.error(
        isEn ? 'Notifications blocked' : 'Notifications bloquées',
        isEn
          ? 'Allow them in your browser site settings, then try again.'
          : 'Autorisez-les dans les réglages du site, puis réessayez.'
      );
      return;
    }
    if (result.reason === 'unsupported') {
      setPushState('unsupported');
      return;
    }

    setPushState('idle');
    setPushAlertsDesired(false);
    if (result.message) {
      toast.error(
        isEn ? 'Could not enable alerts' : 'Impossible d’activer les alertes',
        result.message.includes('404') || result.message.includes('reader-push')
          ? isEn
            ? 'Push alerts are not enabled on the server yet.'
            : 'Les alertes push ne sont pas encore activées côté serveur.'
          : result.message
      );
    }
  }, [pushState, preferences.language, setPushAlertsDesired, toast]);

  const disablePushDesired = useCallback(() => {
    setPushAlertsDesired(false);
    const isEn = preferences.language === 'en';
    toast.info(
      isEn ? 'Alerts disabled' : 'Alertes désactivées',
      isEn
        ? 'You will no longer receive breaking news alerts from this site.'
        : 'Vous ne recevrez plus d’alertes d’actualité de ce site.'
    );
  }, [preferences.language, setPushAlertsDesired, toast]);

  async function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setNewsletterStatus('error');
      setNewsletterMessage(
        preferences.language === 'en'
          ? 'Please enter your email address.'
          : 'Veuillez saisir votre adresse e-mail.'
      );
      return;
    }

    setNewsletterStatus('loading');
    setNewsletterMessage('');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || 'Une erreur est survenue.');

      setNewsletter(trimmed, true);
      setNewsletterStatus('success');
      setNewsletterMessage(
        data.message ||
          (preferences.language === 'en'
            ? 'You are subscribed to the newsletter.'
            : 'Vous êtes inscrit à la newsletter.')
      );
    } catch (error) {
      setNewsletterStatus('error');
      setNewsletterMessage(
        error instanceof Error
          ? error.message
          : preferences.language === 'en'
            ? 'Could not complete subscription.'
            : "Impossible de finaliser l'inscription."
      );
    }
  }

  if (!open) return null;

  const isEn = preferences.language === 'en';

  return (
    <div
      className={cn('flex h-full flex-col bg-card', className)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-settings-title"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={isEn ? 'Back' : 'Retour'}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Settings2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <h2
            id="site-settings-title"
            className="truncate text-sm font-bold uppercase tracking-[0.14em] text-foreground"
          >
            {isEn ? 'Settings' : 'Réglages'}
          </h2>
        </div>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto px-4 py-6">
        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {isEn ? 'Language' : 'Langue'}
          </h3>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-1.5">
            {LANGUAGE_OPTIONS.map((option) => {
              const active = preferences.language === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLanguage(option.value)}
                  className={cn(
                    'rounded-lg px-3 py-3 text-left transition-colors',
                    active
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-pressed={active}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wider opacity-70">
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {isEn
              ? 'Interface language preference. Full English content will follow.'
              : 'Préférence d’affichage. Le contenu entièrement en anglais arrivera ensuite.'}
          </p>
        </section>

        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {isEn ? 'Notifications' : 'Notifications'}
          </h3>
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {pushState === 'subscribed' && preferences.pushAlertsDesired ? (
                  <Bell className="h-5 w-5" />
                ) : (
                  <BellOff className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {isEn ? 'Breaking news alerts' : 'Alertes actualités'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {pushState === 'unsupported'
                    ? isEn
                      ? 'Push alerts are not supported in this browser. Try Chrome or Edge, or the Wab-infos app.'
                      : 'Les alertes push ne sont pas prises en charge sur ce navigateur. Essayez Chrome, Edge ou l’appli Wab-infos.'
                    : pushState === 'denied'
                      ? isEn
                        ? 'Notifications are blocked. Allow them in your browser site settings, then try again.'
                        : 'Notifications bloquées. Autorisez-les dans les réglages du site de votre navigateur, puis réessayez.'
                      : isEn
                        ? 'Get a push when major stories are published.'
                        : 'Recevez une alerte lors des infos majeures.'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {pushState === 'subscribed' && preferences.pushAlertsDesired ? (
                <button
                  type="button"
                  onClick={disablePushDesired}
                  className="inline-flex h-10 items-center rounded-full border border-border px-4 text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-muted"
                >
                  {isEn ? 'Disable' : 'Désactiver'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={enablePush}
                  disabled={
                    pushState === 'loading' ||
                    pushState === 'unsupported' ||
                    pushState === 'denied'
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {pushState === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  {isEn ? 'Enable alerts' : 'Activer les alertes'}
                </button>
              )}
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Newsletter
          </h3>
          <form
            onSubmit={handleNewsletterSubmit}
            className="rounded-xl border border-border bg-background p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {isEn ? 'Daily briefing by email' : 'Le brief du jour par e-mail'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {preferences.newsletterOptIn && preferences.newsletterEmail
                    ? isEn
                      ? `Subscribed as ${preferences.newsletterEmail}`
                      : `Inscrit : ${preferences.newsletterEmail}`
                    : isEn
                      ? 'Receive the main headlines in your inbox.'
                      : 'Recevez les titres essentiels dans votre boîte mail.'}
                </p>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="sr-only">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={isEn ? 'you@example.com' : 'vous@exemple.com'}
                autoComplete="email"
                className="h-11 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
              />
            </label>

            <button
              type="submit"
              disabled={newsletterStatus === 'loading'}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 text-xs font-semibold uppercase tracking-wider text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {newsletterStatus === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {preferences.newsletterOptIn
                ? isEn
                  ? 'Update subscription'
                  : 'Mettre à jour'
                : isEn
                  ? 'Subscribe'
                  : "S'inscrire"}
            </button>

            {newsletterMessage ? (
              <p
                className={cn(
                  'mt-2 text-xs',
                  newsletterStatus === 'error' ? 'text-destructive' : 'text-emerald-600'
                )}
                role="status"
              >
                {newsletterMessage}
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </div>
  );
}
