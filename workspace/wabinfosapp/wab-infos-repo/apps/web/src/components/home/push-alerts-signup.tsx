'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { subscribeToPushNotifications, syncPushSubscriptionIfGranted } from '@/lib/push/client';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'wab-push-alerts-dismiss';

type PushStatus = 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported' | 'error';

function errorMessage(reason?: string, serverMessage?: string): string {
  if (serverMessage?.includes('STRAPI_API_TOKEN')) {
    return 'Configuration serveur incomplète. Contactez l\'équipe technique.';
  }
  if (
    serverMessage?.includes('unique') &&
    (serverMessage?.includes('fcmToken') || serverMessage?.includes('fcmtoken'))
  ) {
    return 'Cet appareil est déjà abonné aux alertes.';
  }
  if (serverMessage?.includes('404') || serverMessage?.includes('reader-push-subscription')) {
    return 'Les alertes push ne sont pas encore activées côté serveur. L\'équipe technique doit mettre à jour le CMS.';
  }
  if (serverMessage) return serverMessage;

  switch (reason) {
    case 'firebase_missing':
      return 'Les alertes ne sont pas encore configurées sur le serveur.';
    case 'sw_unavailable':
      return 'Service worker indisponible. Rechargez la page et réessayez.';
    case 'invalid_token':
      return 'Token de notification invalide. Réessayez ou videz le cache du site.';
    default:
      return 'Impossible d\'activer les alertes. Réessayez plus tard.';
  }
}

interface PushAlertsSignupProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function PushAlertsSignup({ className, variant = 'default' }: PushAlertsSignupProps) {
  const [status, setStatus] = useState<PushStatus>('idle');
  const [errorDetail, setErrorDetail] = useState('');
  const [dismissed, setDismissed] = useState(true);
  const isCompact = variant === 'compact';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      setStatus('unsupported');
      return;
    }

    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    if (Notification.permission === 'granted') {
      syncPushSubscriptionIfGranted().then((ok) => {
        setStatus(ok ? 'subscribed' : 'idle');
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    setStatus('loading');
    setErrorDetail('');

    const result = await subscribeToPushNotifications();

    if (result.ok) {
      setStatus('subscribed');
      localStorage.removeItem(DISMISS_KEY);
      return;
    }

    if (result.reason === 'unsupported') {
      setStatus('unsupported');
      return;
    }
    if (result.reason === 'denied') {
      setStatus('denied');
      return;
    }

    setErrorDetail(errorMessage(result.reason, result.message));
    setStatus('error');
  }, []);

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  if (status === 'unsupported' || (dismissed && status !== 'subscribed')) {
    return null;
  }

  if (status === 'subscribed') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
          isCompact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm',
          className
        )}
      >
        <Bell className="h-4 w-4 shrink-0" />
        <span>Alertes activées — vous serez notifié des nouveaux articles.</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'widget-card overflow-hidden border-border/80',
        className
      )}
    >
      <div className={cn('flex items-start gap-2.5', isCompact ? 'p-3' : 'p-4')}>
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-muted text-foreground',
            isCompact ? 'h-8 w-8' : 'h-10 w-10'
          )}
        >
          <Bell className={isCompact ? 'h-4 w-4' : 'h-5 w-5'} />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest">Alertes</p>
            <p className={cn('text-muted-foreground', isCompact ? 'mt-0.5 text-xs' : 'mt-1 text-sm')}>
              Soyez averti dès qu&apos;un article est publié.
            </p>
          </div>

          {status === 'denied' ? (
            <p className="text-xs text-muted-foreground">
              Notifications bloquées dans votre navigateur. Autorisez-les dans les paramètres du site.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={subscribe}
                disabled={status === 'loading'}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
              >
                {status === 'loading' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
                Activer les alertes
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <BellOff className="h-3.5 w-3.5" />
                Plus tard
              </button>
            </div>
          )}

          {status === 'error' && (
            <p className="text-xs text-destructive">{errorDetail}</p>
          )}
        </div>
      </div>
    </div>
  );
}
