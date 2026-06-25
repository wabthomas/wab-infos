import { createHash } from 'node:crypto';

/** Clé courte pour rechercher un token FCM sans filtre GET sur la valeur complète. */
export function fcmTokenKey(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isDuplicateFcmTokenError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('400') && message.includes('unique') && message.includes('fcmtoken');
}
