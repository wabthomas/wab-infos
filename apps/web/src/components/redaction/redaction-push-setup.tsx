'use client';

import { useEffect } from 'react';
import {
  registerRedactionServiceWorker,
  REDACTION_SW_SCOPE,
} from '@/lib/redaction/register-service-worker';
import { isFirebaseClientConfigured, requestFcmToken } from '@/lib/firebase/client';

export function RedactionPushSetup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let cancelled = false;

    async function setup() {
      try {
        if (!(await isFirebaseClientConfigured())) return;
        const permission = await Notification.requestPermission();
        if (permission !== 'granted' || cancelled) return;

        const registration =
          (await navigator.serviceWorker.getRegistration(REDACTION_SW_SCOPE)) ||
          (await registerRedactionServiceWorker());
        if (!registration || cancelled) return;

        await navigator.serviceWorker.ready;

        const fcmToken = await requestFcmToken(registration);
        if (!fcmToken || cancelled) return;

        await fetch('/api/redaction/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fcmToken }),
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
