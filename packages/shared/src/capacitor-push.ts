export type NativePushResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'unsupported' | 'denied' | 'invalid_token' | 'server_error';
      message?: string;
    };

export type CapacitorPushPermission = 'granted' | 'denied' | 'prompt';

export async function isNativeCapacitorApp(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function getCapacitorPushPermission(): Promise<CapacitorPushPermission | null> {
  if (!(await isNativeCapacitorApp())) return null;
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'granted') return 'granted';
  if (permission.receive === 'denied') return 'denied';
  return 'prompt';
}

async function postNativeToken(
  subscribePath: string,
  fcmToken: string,
  platform: 'android' | 'ios'
): Promise<NativePushResult> {
  const res = await fetch(subscribePath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fcmToken, platform }),
    credentials: 'include',
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, reason: 'server_error', message: data.error };
  }

  return { ok: true };
}

export interface SubscribeCapacitorPushOptions {
  subscribePath: string;
  platform?: 'android' | 'ios';
  /** false = uniquement si permission déjà accordée */
  requestPermission?: boolean;
}

export async function subscribeViaCapacitorPush(
  options: SubscribeCapacitorPushOptions
): Promise<NativePushResult> {
  if (!(await isNativeCapacitorApp())) {
    return { ok: false, reason: 'unsupported' };
  }

  const { PushNotifications } = await import('@capacitor/push-notifications');
  const platform = options.platform ?? 'android';

  if (options.requestPermission !== false) {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') {
      return { ok: false, reason: 'denied' };
    }
  } else {
    const permission = await PushNotifications.checkPermissions();
    if (permission.receive !== 'granted') {
      return { ok: false, reason: 'denied' };
    }
  }

  return new Promise<NativePushResult>((resolve) => {
    let settled = false;

    const finish = (result: NativePushResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      void registrationListener.then((h) => h.remove());
      void errorListener.then((h) => h.remove());
      resolve(result);
    };

    const timer = window.setTimeout(() => {
      finish({
        ok: false,
        reason: 'invalid_token',
        message: 'Délai dépassé — vérifiez google-services.json et Firebase Android.',
      });
    }, 20_000);

    const registrationListener = PushNotifications.addListener('registration', (token) => {
      void postNativeToken(options.subscribePath, token.value, platform).then(finish);
    });

    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      finish({
        ok: false,
        reason: 'invalid_token',
        message: error.error,
      });
    });

    void PushNotifications.register();
  });
}

export async function syncCapacitorPushIfGranted(
  options: SubscribeCapacitorPushOptions
): Promise<boolean> {
  if (!(await isNativeCapacitorApp())) return false;
  const permission = await getCapacitorPushPermission();
  if (permission !== 'granted') return false;
  const result = await subscribeViaCapacitorPush({ ...options, requestPermission: false });
  return result.ok;
}

export async function setupCapacitorPushListeners(): Promise<void> {
  if (!(await isNativeCapacitorApp())) return;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
    const data = event.notification.data as { url?: string } | undefined;
    const rawUrl = data?.url;
    if (!rawUrl || typeof window === 'undefined') return;

    if (rawUrl.startsWith('http')) {
      window.location.href = rawUrl;
      return;
    }

    window.location.href = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  });
}
