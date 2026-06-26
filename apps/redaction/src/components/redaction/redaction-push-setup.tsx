'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Loader2, X } from 'lucide-react';
import {
  registerRedactionServiceWorker,
  REDACTION_SW_SCOPE,
} from '@/lib/redaction/register-service-worker';
import { isFirebaseClientConfigured, requestFcmToken } from '@/lib/firebase/client';

const DISMISS_KEY = 'redaction-push-banner-dismiss';

async function registerPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !(await isFirebaseClientConfigured())) {
    return false;
  }

  const registration =
    (await navigator.serviceWorker.getRegistration(REDACTION_SW_SCOPE)) ||
    (await registerRedactionServiceWorker());
  if (!registration) return false;

  await navigator.serviceWorker.ready;

  const tokenResult = await requestFcmToken(registration);
  if (!tokenResult.ok) {
    console.warn('[push]', tokenResult.code, tokenResult.message);
    return false;
  }

  const res = await fetch('/api/redaction/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fcmToken: tokenResult.token }),
  });

  return res.ok;
}

export function RedactionPushSetup() {
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    void registerPushSubscription();
  }, []);

  return null;
}

export function RedactionPushBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return;
    }

    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    void isFirebaseClientConfigured().then((ok) => {
      if (ok) setVisible(true);
    });
  }, []);

  const enable = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Autorisation refusée dans le navigateur.');
        return;
      }

      const ok = await registerPushSubscription();
      if (!ok) {
        setError('Enregistrement impossible. Réessayez après avoir vidé le cache.');
        return;
      }

      localStorage.removeItem(DISMISS_KEY);
      setVisible(false);
    } catch {
      setError('Erreur lors de l’activation.');
    } finally {
      setLoading(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Notifications commentaires</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Soyez alerté quand un lecteur laisse un commentaire en attente.
          </p>
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
          <button
            type="button"
            disabled={loading}
            onClick={() => void enable()}
            className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Activation…
              </span>
            ) : (
              'Activer'
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1');
            setVisible(false);
          }}
          className="shrink-0 rounded-full p-1 text-muted-foreground active:bg-muted"
          aria-label="Masquer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
