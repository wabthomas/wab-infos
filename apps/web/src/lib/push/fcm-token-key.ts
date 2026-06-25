export function isDuplicateFcmTokenError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('400') && message.includes('unique') && message.includes('fcmtoken');
}
