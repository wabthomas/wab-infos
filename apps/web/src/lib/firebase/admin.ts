import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirebaseServiceAccount } from '@/lib/firebase/config';

let initAttempted = false;

export function ensureFirebaseAdmin(): App | null {
  if (getApps().length) {
    return getApps()[0]!;
  }

  if (initAttempted) return null;
  initAttempted = true;

  const serviceAccount = getFirebaseServiceAccount();
  if (!serviceAccount) return null;

  try {
    return initializeApp({
      credential: cert({
        projectId: serviceAccount.projectId,
        clientEmail: serviceAccount.clientEmail,
        privateKey: serviceAccount.privateKey,
      }),
    });
  } catch (error) {
    console.error('[firebase/admin] init failed', error);
    return null;
  }
}

export interface FcmNotificationPayload {
  title: string;
  body: string;
  url: string;
}

export async function sendFcmToToken(
  token: string,
  payload: FcmNotificationPayload
): Promise<void> {
  const app = ensureFirebaseAdmin();
  if (!app) throw new Error('Firebase Admin non configuré');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const absoluteUrl = payload.url.startsWith('http')
    ? payload.url
    : `${siteUrl}${payload.url}`;

  await getMessaging(app).send({
    token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      title: payload.title,
      body: payload.body,
      url: absoluteUrl,
    },
    android: {
      priority: 'high',
      ttl: 86400,
      notification: {
        channelId: 'wab_infos_news',
        sound: 'default',
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    },
    webpush: {
      fcmOptions: { link: absoluteUrl },
      notification: {
        title: payload.title,
        body: payload.body,
        icon: `${siteUrl}/icons/icon-192.png`,
      },
    },
  });
}

export function isInvalidFcmTokenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code =
    'code' in error && typeof (error as { code?: string }).code === 'string'
      ? (error as { code: string }).code
      : '';
  return (
    code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token'
  );
}
