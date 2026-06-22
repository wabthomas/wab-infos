import webpush from 'web-push';

export function vapidSubject(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '') ?? 'wab-infos.com';
  return process.env.VAPID_SUBJECT || `mailto:contact@${site}`;
}

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

export function ensureWebPushConfigured(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(vapidSubject(), publicKey, privateKey);
  return true;
}

export { webpush };
