import { isNativeCapacitorApp } from '@wab-infos/shared';
import { siteConfig } from '@/config/site';
import { readUserPreferences } from '@/lib/user-preferences';

const WELCOME_TAG = 'wab-welcome-notification';
const TRUST_IMAGE = '/notifications/trust-world.jpg';

type Lang = 'fr' | 'en';

/**
 * Une seule notif de confirmation (web + native).
 * Chrome traite 2 notifs après l’opt-in comme du spam — même avec un délai.
 */
function welcomeCopy(language: Lang) {
  if (language === 'en') {
    return {
      title: `Welcome to ${siteConfig.name}`,
      body: 'Thanks for your trust — you are subscribed to our news alerts.',
    };
  }
  return {
    title: `Bienvenue sur ${siteConfig.name}`,
    body: 'Merci pour votre confiance — vous êtes abonné(e) à nos alertes d’actualité.',
  };
}

async function resolveRegistration(
  registration?: ServiceWorkerRegistration | null
): Promise<ServiceWorkerRegistration | null> {
  if (registration) return registration;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.ready.catch(() => null);
}

function absoluteAsset(path: string): string {
  return new URL(path, window.location.origin).href;
}

async function showWebNotification(
  title: string,
  options: NotificationOptions & { renotify?: boolean; image?: string },
  registration?: ServiceWorkerRegistration | null
): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const reg = await resolveRegistration(registration);
  if (reg?.showNotification) {
    await reg.showNotification(title, options);
    return;
  }

  // eslint-disable-next-line no-new
  new Notification(title, options);
}

async function showNativeLocalNotification(params: {
  id: number;
  title: string;
  body: string;
}): Promise<boolean> {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id: params.id,
          title: params.title,
          body: params.body,
          sound: 'default',
          extra: { url: '/' },
          channelId: 'wab_infos_news',
          largeBody: params.body,
          summaryText: siteConfig.name,
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/** Confirmation unique après abonnement push (évite le filtre anti-spam Chrome). */
export async function showWelcomePushNotification(
  registration?: ServiceWorkerRegistration | null
): Promise<void> {
  if (typeof window === 'undefined') return;

  const language = readUserPreferences().language;
  const { title, body } = welcomeCopy(language);
  const icon = absoluteAsset('/icons/icon-192.png');
  const badge = absoluteAsset('/icons/icon-192.png');
  const image = absoluteAsset(TRUST_IMAGE);

  try {
    if (await isNativeCapacitorApp()) {
      const ok = await showNativeLocalNotification({ id: 24001, title, body });
      if (ok) return;
    }

    await showWebNotification(
      title,
      {
        body,
        icon,
        badge,
        image,
        tag: WELCOME_TAG,
        renotify: false,
        lang: language,
        data: { url: '/', source: 'welcome' },
      },
      registration
    );
  } catch (error) {
    console.warn('[push] welcome notification failed', error);
  }
}
