'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import {
  hasCachedFcmToken,
  isNativeCapacitorApp,
  isNativeCapacitorFromUserAgent,
} from '@wab-infos/shared';
import {
  getAndroidReaderPushPermission,
  getCapacitorPushPermission,
  isAndroidWebViewReaderApp,
  subscribeToPushNotifications,
  syncPushSubscriptionIfGranted,
} from '@/lib/push/client';
import { useSiteChrome } from '@/components/providers/site-chrome-context';
import { useUserPreferences } from '@/components/providers/user-preferences-provider';
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
  const { chrome } = useSiteChrome();
  const { setPushAlertsDesired, preferences } = useUserPreferences();
  const activeColor = chrome.headerPushAlertsActiveColor || '#059669';
  const [state, setState] = useState<AlertState>('idle');
  const isNativeUa = isNativeCapacitorFromUserAgent();
  const onAndroidReader = isAndroidWebViewReaderApp();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (typeof window === 'undefined') return;

      if (isAndroidWebViewReaderApp()) {
        const permission = getAndroidReaderPushPermission();
        if (cancelled) return;
        if (permission === 'denied') {
          setState('denied');
          return;
        }
        if (permission === 'granted') {
          setState('subscribed');
          void syncPushSubscriptionIfGranted();
          return;
        }
        if (!cancelled) {
          setState(preferences.pushAlertsDesired ? 'subscribed' : 'idle');
        }
        return;
      }

      const native = (await isNativeCapacitorApp()) || isNativeCapacitorFromUserAgent();

      if (native) {
        try {
          const permission = await getCapacitorPushPermission();
          if (cancelled) return;

          if (permission === 'denied') {
            setState('denied');
            return;
          }

          if (permission === 'granted' || hasCachedFcmToken()) {
            setState('subscribed');
            void syncPushSubscriptionIfGranted();
            return;
          }

          if (!cancelled) {
            setState(preferences.pushAlertsDesired ? 'subscribed' : 'idle');
          }
        } catch {
          if (!cancelled) {
            setState(hasCachedFcmToken() || preferences.pushAlertsDesired ? 'subscribed' : 'idle');
          }
        }
        return;
      }

      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        if (!cancelled) setState('unsupported');
        return;
      }

      if (Notification.permission === 'denied') {
        if (!cancelled) setState('denied');
        return;
      }

      if (Notification.permission === 'granted') {
        if (!cancelled) setState('subscribed');
        void syncPushSubscriptionIfGranted();
        return;
      }

      if (!cancelled) setState('idle');
    }

    void init();

    const onSubscribed = () => setState('subscribed');
    window.addEventListener('wab-push-subscribed', onSubscribed);
    return () => {
      cancelled = true;
      window.removeEventListener('wab-push-subscribed', onSubscribed);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; prefs read at mount
  }, []);

  const handleClick = useCallback(async () => {
    if (state === 'unsupported' || state === 'denied' || state === 'subscribed' || state === 'loading') {
      return;
    }

    setState('loading');
    const result = await subscribeToPushNotifications();

    if (result.ok) {
      setPushAlertsDesired(true);
      setState('subscribed');
      window.dispatchEvent(new Event('wab-push-subscribed'));
      return;
    }
    if (result.reason === 'denied') {
      setState('denied');
      return;
    }
    if (result.reason === 'unsupported') {
      if (onAndroidReader || isNativeUa || (await isNativeCapacitorApp())) {
        setState('idle');
        return;
      }
      setState('unsupported');
      return;
    }
    if (result.reason === 'server_error' && result.message) {
      window.alert(
        result.message.includes('404') || result.message.includes('reader-push')
          ? 'Les alertes push ne sont pas encore activées côté serveur.'
          : result.message
      );
    }
    setState('idle');
  }, [state, setPushAlertsDesired, isNativeUa, onAndroidReader]);

  if (state === 'unsupported' && !isNativeUa && !onAndroidReader) return null;

  const label =
    state === 'subscribed'
      ? 'Alertes activées'
      : state === 'denied'
        ? 'Bloquées'
        : 'Alertes';

  const subscribed = state === 'subscribed';
  const inactive = state === 'loading' || state === 'denied' || state === 'subscribed';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-disabled={inactive || undefined}
      className={cn(
        labeled
          ? 'flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-1.5 transition-colors'
          : 'inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors',
        subscribed
          ? 'opacity-100'
          : state === 'denied'
            ? 'text-muted-foreground/50'
            : 'text-foreground hover:bg-muted',
        inactive && !subscribed ? 'opacity-70' : null,
        className
      )}
      style={subscribed ? { color: activeColor } : undefined}
      aria-label={label}
      title={label}
    >
      {state === 'loading' ? (
        <Loader2 className={cn('h-5 w-5 animate-spin', iconClassName)} style={{ color: 'inherit' }} />
      ) : (
        <Bell
          className={cn('h-5 w-5', subscribed && 'fill-current', iconClassName)}
          strokeWidth={subscribed ? 2.5 : 2}
          style={subscribed ? { color: activeColor } : undefined}
        />
      )}
      {labeled && (
        <span
          className={cn(
            'text-[10px] font-semibold leading-none',
            subscribed ? null : 'text-muted-foreground'
          )}
          style={subscribed ? { color: activeColor } : undefined}
        >
          {label}
        </span>
      )}
    </button>
  );
}
