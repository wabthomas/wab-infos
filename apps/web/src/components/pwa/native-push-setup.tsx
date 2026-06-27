'use client';

import { useEffect } from 'react';
import {
  isNativeCapacitorApp,
  setupCapacitorPushListeners,
  subscribeViaCapacitorPush,
} from '@/lib/push/capacitor-native';

const NATIVE_PUSH_PROMPT_KEY = 'wab-native-push-prompted';

/**
 * Sur l'APK Wab-infos : enregistre le token FCM lecteur + écoute les notifications.
 */
export function NativePushSetup() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!(await isNativeCapacitorApp())) return;

      await setupCapacitorPushListeners();

      const { PushNotifications } = await import('@capacitor/push-notifications');
      const permission = await PushNotifications.checkPermissions();

      if (permission.receive === 'granted') {
        return;
      }

      if (cancelled || permission.receive === 'denied') return;
      if (localStorage.getItem(NATIVE_PUSH_PROMPT_KEY) === '1') return;

      localStorage.setItem(NATIVE_PUSH_PROMPT_KEY, '1');
      await subscribeViaCapacitorPush();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
