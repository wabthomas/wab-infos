import { navigateInApp, resolvePublicHttpsUrl } from './capacitor-nav';

export type NativePushResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'unsupported' | 'denied' | 'invalid_token' | 'server_error';
      message?: string;
    };

export type CapacitorPushPermission = 'granted' | 'denied' | 'prompt';

const FCM_TOKEN_STORAGE_KEY = 'wab-fcm-token';

function getCachedFcmToken(): string | null {
  try {
    const cached = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (!cached || cached.length < 20) return null;
    return cached;
  } catch {
    return null;
  }
}

export interface CapacitorPushInitOptions {
  subscribePath: string;
  platform?: 'android' | 'ios';
}

let pushInitPromise: Promise<void> | null = null;
let activeSubscribePath: string | null = null;
let activePlatform: 'android' | 'ios' = 'android';

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
  try {
    localStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken);
  } catch {
    // ignore
  }

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

async function repostCachedToken(subscribePath: string, platform: 'android' | 'ios'): Promise<void> {
  const cached = getCachedFcmToken();
  if (!cached) return;
  try {
    await postNativeToken(subscribePath, cached, platform);
  } catch {
    // ignore
  }
}

async function ensureCapacitorPushListeners(): Promise<void> {
  if (!(await isNativeCapacitorApp())) return;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  await PushNotifications.addListener('registration', (token) => {
    const path = activeSubscribePath;
    if (!path || !token.value) return;
    void postNativeToken(path, token.value, activePlatform);
  });

  await PushNotifications.addListener('registrationError', (error) => {
    console.warn('[push/native] registrationError', error.error);
  });

  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    void (async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display !== 'granted') {
          const requested = await LocalNotifications.requestPermissions();
          if (requested.display !== 'granted') return;
        }

        const data = notification.data as { title?: string; body?: string; url?: string } | undefined;
        const title =
          data?.title || notification.title || (typeof notification.data?.title === 'string' ? notification.data.title : 'Wab-infos');
        const body =
          data?.body || notification.body || (typeof notification.data?.body === 'string' ? notification.data.body : '');

        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 1_000_000),
              title,
              body,
              extra: { url: data?.url },
              channelId: 'wab_infos_news',
            },
          ],
        });
      } catch {
        // LocalNotifications optional — notification système si app en arrière-plan
      }
    })();
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
    const data = event.notification.data as { url?: string } | undefined;
    const rawUrl = data?.url;
    if (!rawUrl || typeof window === 'undefined') return;

    if (rawUrl.startsWith('http')) {
      void navigateInApp(resolvePublicHttpsUrl(rawUrl, rawUrl));
      return;
    }

    window.location.href = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  });
}

/** Initialise les écouteurs push + enregistre le token FCM côté serveur. */
export async function initCapacitorPush(options: CapacitorPushInitOptions): Promise<void> {
  if (!(await isNativeCapacitorApp())) return;

  activeSubscribePath = options.subscribePath;
  activePlatform = options.platform ?? 'android';

  if (!pushInitPromise) {
    pushInitPromise = ensureCapacitorPushListeners();
  }
  await pushInitPromise;

  const { PushNotifications } = await import('@capacitor/push-notifications');
  const permission = await PushNotifications.checkPermissions();

  if (permission.receive === 'granted') {
    await repostCachedToken(options.subscribePath, activePlatform);
    await PushNotifications.register();
  }
}

/** @deprecated Utiliser initCapacitorPush */
export async function setupCapacitorPushListeners(options?: CapacitorPushInitOptions): Promise<void> {
  if (options?.subscribePath) {
    await initCapacitorPush(options);
    return;
  }
  if (!pushInitPromise) {
    pushInitPromise = ensureCapacitorPushListeners();
  }
  await pushInitPromise;
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

  await initCapacitorPush({
    subscribePath: options.subscribePath,
    platform: options.platform,
  });

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
      void (async () => {
        try {
          const cached = getCachedFcmToken();
          if (cached) {
            finish(await postNativeToken(options.subscribePath, cached, platform));
            return;
          }
          finish({
            ok: false,
            reason: 'invalid_token',
            message: 'Délai dépassé — vérifiez google-services.json et Firebase Android.',
          });
        } catch {
          finish({
            ok: false,
            reason: 'invalid_token',
            message: 'Impossible de finaliser l’abonnement push.',
          });
        }
      })();
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

  await initCapacitorPush({
    subscribePath: options.subscribePath,
    platform: options.platform,
  });

  const cached = getCachedFcmToken();
  if (cached) {
    const repost = await postNativeToken(options.subscribePath, cached, options.platform ?? 'android');
    if (repost.ok) return true;
  }

  const result = await subscribeViaCapacitorPush({ ...options, requestPermission: false });
  return result.ok;
}
