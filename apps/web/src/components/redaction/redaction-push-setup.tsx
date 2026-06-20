'use client';

import { useEffect } from 'react';
import {
  registerRedactionServiceWorker,
  REDACTION_SW_SCOPE,
} from '@/lib/redaction/register-service-worker';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function RedactionPushSetup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    let cancelled = false;

    async function setup() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted' || cancelled) return;

        const registration =
          (await navigator.serviceWorker.getRegistration(REDACTION_SW_SCOPE)) ||
          (await registerRedactionServiceWorker());
        if (!registration || cancelled) return;

        await navigator.serviceWorker.ready;

        const keyRes = await fetch('/api/redaction/push/vapid-key');
        if (!keyRes.ok || cancelled) return;
        const { publicKey } = (await keyRes.json()) as { publicKey?: string };
        if (!publicKey) return;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
          });
        }

        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return;

        await fetch('/api/redaction/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: {
              endpoint: json.endpoint,
              keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
            },
          }),
        });
      } catch {
        // Push optionnel — échec silencieux
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
