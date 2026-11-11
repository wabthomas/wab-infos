import 'server-only';
import { notifyEditorsByEmail } from '@/lib/redaction/web-push';

/** Après COMMIT uniquement : une panne Strapi/FCM ne remet pas le message en cause.
 * Envoyer en lot limite la lecture Strapi à une requête pour tous les destinataires. */
export async function pushRhChatMessage(emails: string[]): Promise<void> {
  if (!emails.length) return;
  try {
    const result = await notifyEditorsByEmail(emails, {
      title: 'Nouveau message RH',
      body: 'Vous avez reçu un nouveau message.',
      url: '/mon-rh/chat',
    });
    if (result.failed) console.warn('[rh-chat] notifications push non livrées', result.failed);
  } catch (error) {
    console.warn('[rh-chat] push indisponible', error instanceof Error ? error.name : 'erreur');
  }
}
