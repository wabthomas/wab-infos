'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { subscribeToPushNotifications, syncPushSubscriptionIfGranted } from '@/lib/push/client';
import { cn } from '@/lib/utils';

type AlertState = 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported';

interface PushAlertsIconButtonProps {
  className?: string;
  iconClassName?: string;
  labeled?: boolean;
}

export function PushAlertsIconButton({
  className,
  iconClassName,
  labeled = false,
}: PushAlertsIconButtonProps) {
  const [state, setState] = useState<AlertState>('idle');

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setState('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }

    if (Notification.permission === 'granted') {
      syncPushSubscriptionIfGranted().then((ok) => {
        setState(ok ? 'subscribed' : 'idle');
      });
    }

    const onSubscribed = () => setState('subscribed');
    window.addEventListener('wab-push-subscribed', onSubscribed);
    return () => window.removeEventListener('wab-push-subscribed', onSubscribed);
  }, []);

  const handleClick = useCallback(async () => {
    if (state === 'unsupported' || state === 'denied' || state === 'subscribed' || state === 'loading') {
      return;
    }

    setState('loading');
    const result = await subscribeToPushNotifications();

    if (result.ok) {
      setState('subscribed');
      window.dispatchEvent(new Event('wab-push-subscribed'));
      return;
    }
    if (result.reason === 'denied') {
      setState('denied');
      return;
    }
    if (result.reason === 'unsupported') {
      setState('unsupported');
      return;
    }
    if (result.reason === 'server_error' && result.message) {
      window.alert(result.message.includes('404') || result.message.includes('reader-push')
        ? 'Les alertes push ne sont pas encore activées côté serveur.'
        : result.message);
    }
    setState('idle');
  }, [state]);

  if (state === 'unsupported') return null;

  const label =
    state === 'subscribed'
      ? 'Alertes activées'
      : state === 'denied'
        ? 'Bloquées'
        : 'Alertes';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'loading' || state === 'denied' || state === 'subscribed'}
      className={cn(
        labeled
          ? 'flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-1.5 transition-colors disabled:opacity-70'
          : 'inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors',
        state === 'subscribed'
          ? 'text-emerald-600'
          : state === 'denied'
            ? 'text-muted-foreground/50'
            : 'text-foreground hover:bg-muted',
        className
      )}
      aria-label={label}
      title={label}
    >
      {state === 'loading' ? (
        <Loader2 className={cn('h-5 w-5 animate-spin', iconClassName)} />
      ) : (
        <Bell
          className={cn('h-5 w-5', state === 'subscribed' && 'fill-current', iconClassName)}
          strokeWidth={state === 'subscribed' ? 2.5 : 2}
        />
      )}
      {labeled && (
        <span className="text-[10px] font-semibold leading-none text-muted-foreground">{label}</span>
      )}
    </button>
  );
}
