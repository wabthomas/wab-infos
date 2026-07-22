'use client';

import { useCallback, useState } from 'react';
import { Bell } from 'lucide-react';
import { OptInActions, OptInDialogShell } from '@/components/opt-in/opt-in-dialog-shell';
import { useUserPreferences } from '@/components/providers/user-preferences-provider';
import { readUserPreferences } from '@/lib/user-preferences';
import { subscribeToPushNotifications, syncPushSubscriptionIfGranted } from '@/lib/push/client';

export const PUSH_PROMPT_DISMISS_KEY = 'wab-push-prompt-dismissed';
/** Aligné avec le widget sidebar / home */
export const PUSH_WIDGET_DISMISS_KEY = 'wab-push-alerts-dismiss';

interface PushOptInPromptProps {
  open: boolean;
  onResolved: () => void;
}

export function PushOptInPrompt({ open, onResolved }: PushOptInPromptProps) {
  const { preferences, setPushAlertsDesired } = useUserPreferences();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dismiss = useCallback(() => {
    localStorage.setItem(PUSH_PROMPT_DISMISS_KEY, '1');
    localStorage.setItem(PUSH_WIDGET_DISMISS_KEY, '1');
    setPushAlertsDesired(false);
    onResolved();
  }, [onResolved, setPushAlertsDesired]);

  const allow = useCallback(async () => {
    setLoading(true);
    setError('');
    setPushAlertsDesired(true);

    const result = await subscribeToPushNotifications();
    setLoading(false);

    if (result.ok) {
      localStorage.removeItem(PUSH_PROMPT_DISMISS_KEY);
      localStorage.removeItem(PUSH_WIDGET_DISMISS_KEY);
      window.dispatchEvent(new Event('wab-push-subscribed'));
      onResolved();
      return;
    }

    if (result.reason === 'denied') {
      setError(
        preferences.language === 'en'
          ? 'Notifications were blocked. You can enable them later in browser settings.'
          : 'Notifications refusées. Vous pourrez les activer plus tard dans les réglages du navigateur.'
      );
      localStorage.setItem(PUSH_PROMPT_DISMISS_KEY, '1');
      // Laisse le message visible un instant avant de fermer
      window.setTimeout(() => onResolved(), 1200);
      return;
    }

    if (result.reason === 'unsupported') {
      localStorage.setItem(PUSH_PROMPT_DISMISS_KEY, '1');
      onResolved();
      return;
    }

    setError(
      result.message ||
        (preferences.language === 'en'
          ? 'Could not enable alerts. Please try again.'
          : 'Impossible d’activer les alertes. Réessayez.')
    );
  }, [onResolved, preferences.language, setPushAlertsDesired]);

  const isEn = preferences.language === 'en';

  return (
    <OptInDialogShell open={open} titleId="push-opt-in-title" onClose={dismiss}>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <Bell className="h-7 w-7" strokeWidth={2.25} />
        </span>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          {isEn ? 'Stay ahead' : 'Ne ratez rien'}
        </p>
        <h2
          id="push-opt-in-title"
          className="font-display mt-2 text-2xl font-bold tracking-tight text-foreground"
        >
          {isEn ? 'Enable news alerts?' : 'Activer les alertes ?'}
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {isEn
            ? 'Get a push notification when major stories are published on Wab-infos.'
            : 'Recevez une notification dès qu’une information majeure est publiée sur Wab-infos.'}
        </p>
      </div>

      {error ? (
        <p
          className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-center text-xs text-destructive"
          role="status"
        >
          {error}
        </p>
      ) : null}

      <OptInActions
        secondaryLabel={isEn ? 'Refuse' : 'Refuser'}
        primaryLabel={isEn ? 'Allow' : 'Autoriser'}
        onSecondary={dismiss}
        onPrimary={allow}
        primaryLoading={loading}
        primaryIcon={<Bell className="h-4 w-4" />}
      />

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        {isEn
          ? 'You can change this anytime in Menu → Settings.'
          : 'Modifiable à tout moment dans Menu → Réglages.'}
      </p>
    </OptInDialogShell>
  );
}

/** Détermine si le prompt push doit être proposé. */
export async function shouldOfferPushPrompt(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(PUSH_PROMPT_DISMISS_KEY) === '1') return false;
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return false;
  if (Notification.permission === 'denied') return false;

  if (Notification.permission === 'granted') {
    const ok = await syncPushSubscriptionIfGranted();
    return !ok;
  }

  const prefs = readUserPreferences();
  if (prefs.pushAlertsDesired) return false;
  return true;
}
