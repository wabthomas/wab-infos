'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { registerSiteServiceWorker } from '@/lib/pwa/register-site-sw';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'wab-push-alerts-dismiss';

type PushStatus = 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported' | 'error';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

interface PushAlertsSignupProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function PushAlertsSignup({ className, variant = 'default' }: PushAlertsSignupProps) {
  const [status, setStatus] = useState<PushStatus>('idle');
  const [dismissed, setDismissed] = useState(true);
  const isCompact = variant === 'compact';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported');
      return;
    }

    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');

    if (Notification.permission === 'granted') {
      setStatus('subscribed');
    } else if (Notification.permission === 'denied') {
      setStatus('denied');
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    setStatus('loading');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      const registration = (await registerSiteServiceWorker()) ?? (await navigator.serviceWorker.ready);
      if (!registration) {
        setStatus('error');
        return;
      }

      const keyRes = await fetch('/api/push/vapid-key');
      if (!keyRes.ok) {
        setStatus('error');
        return;
      }

      const { publicKey } = (await keyRes.json()) as { publicKey?: string };
      if (!publicKey) {
        setStatus('error');
        return;
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setStatus('error');
        return;
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          },
        }),
      });

      if (!res.ok) {
        setStatus('error');
        return;
      }

      setStatus('subscribed');
      localStorage.removeItem(DISMISS_KEY);
    } catch {
      setStatus('error');
    }
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
            <p className="text-xs text-destructive">Impossible d&apos;activer les alertes. Réessayez plus tard.</p>
          )}
        </div>
      </div>
    </div>
  );
}
