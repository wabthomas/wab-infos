import { createHash } from 'node:crypto';

/** Clé courte pour rechercher un abonnement sans filtre GET sur l'URL (trop longue). */
export function pushEndpointKey(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex');
}

export function isDuplicatePushEndpointError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('400') &&
    message.includes('unique') &&
    (message.includes('endpoint') || message.includes('endpointkey'))
  );
}
