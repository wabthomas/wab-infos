'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Loader2, X } from 'lucide-react';
import {
  registerRedactionServiceWorker,
} from '@/lib/redaction/register-service-worker';
import {
  isEditorPushOptedOut,
  registerEditorPushSubscription,
} from '@/lib/redaction/register-editor-push';
import { isFirebaseClientConfigured, setupForegroundFcmListener } from '@/lib/firebase/client';
import {
  getAndroidWebViewBridge,
  getAndroidWebViewPushPermission,
  isNativeCapacitorFromUserAgent,
} from '@wab-infos/shared';
import {
  getCapacitorPushPermission,
  isNativeCapacitorApp,
} from '@/lib/push/capacitor-native';

const DISMISS_KEY = 'redaction-push-banner-dismiss';

function isNativeEditorApp(): boolean {
  return isNativeCapacitorFromUserAgent() || Boolean(getAndroidWebViewBridge());
}

export function RedactionPushSetup() {
  useEffect(() => {
    void (async () => {
      if (isNativeEditorApp()) {
        // Auto-sync token si permission déjà accordée (APK WebView).
        const status = getAndroidWebViewPushPermission();
        if (status === 'granted' && !isEditorPushOptedOut()) {
          void registerEditorPushSubscription();
        }
        return;
      }

      if (await isNativeCapacitorApp()) return;

      void registerRedactionServiceWorker();
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      if (isNativeEditorApp() || (await isNativeCapacitorApp())) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      void setupForegroundFcmListener();
      if (!isEditorPushOptedOut()) {
        void registerEditorPushSubscription();
      }
    })();
  }, []);

  return null;
}

export function RedactionPushBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;

      if (isNativeEditorApp()) {
        const permission = getAndroidWebViewPushPermission();
        if (permission === 'granted' || permission === 'denied') return;
        setVisible(true);
        return;
      }

      if (await isNativeCapacitorApp()) {
        const permission = await getCapacitorPushPermission();
        if (permission === 'granted' || permission === 'denied') return;
        setVisible(true);
        return;
      }

      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted' || Notification.permission === 'denied') return;

      const ok = await isFirebaseClientConfigured();
      if (ok) setVisible(true);
    })();
  }, []);

  const enable = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await registerEditorPushSubscription();
      if (!result.ok) {
        setError(result.message);
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
          <p className="text-sm font-semibold">Notifications rédaction</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Commentaires en attente et rappels matin, midi et soir si vous n’avez pas encore écrit
            aujourd’hui.
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
