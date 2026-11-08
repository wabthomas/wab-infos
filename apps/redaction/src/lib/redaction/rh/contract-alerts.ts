import 'server-only';
import { getRhFlags } from './flags';

type ContractAlertEvent = 'proposed' | 'signed' | 'signedEmployee' | 'approved' | 'term' | 'termAdmin';

/** Mêmes textes que les notifications RH, push + e-mail. Jamais de montant ni de clause. */
export async function pushContractAlert(emails: (string | null | undefined)[], event: ContractAlertEvent): Promise<void> {
  try {
    const flags = await getRhFlags();
    if (!flags.contractsEnabled || !flags.notificationsEnabled) return;
    const [{ notifyEditorsByEmail }, { sendRhNotificationEmail }] = await Promise.all([
      import('../web-push'),
      import('./notification-email'),
    ]);
    const messages: Record<ContractAlertEvent, { title: string; body: string; url: string }> = {
      proposed: { title: 'Contrat à signer', body: 'Votre contrat est prêt. Ouvrez Mes contrats pour le lire et le signer.', url: '/mon-rh/contrats' },
      signed: { title: 'Contrat signé à approuver', body: 'Un collaborateur a signé son contrat. Ouvrez RH → Contrats pour l’approuver.', url: '/rh/contrats' },
      signedEmployee: { title: 'Contrat transmis', body: 'Votre signature a été enregistrée. Le contrat attend l’approbation de l’administration.', url: '/mon-rh/contrats' },
      approved: { title: 'Contrat approuvé', body: 'Votre contrat est approuvé. Consultez-le dans Mes contrats.', url: '/mon-rh/contrats' },
      termAdmin: { title: 'CDD bientôt échu', body: 'Un contrat CDD approche de son terme. Consultez RH → Contrats.', url: '/rh/contrats' },
      term: { title: 'CDD bientôt échu', body: 'Votre contrat CDD arrive à échéance. Contactez l’administration RH.', url: '/mon-rh/contrats' },
    };
    const unique = [...new Set(emails.filter((email): email is string => !!email?.trim()).map((email) => email.trim().toLowerCase()))];
    if (!unique.length) return;
    const message = messages[event];
    await Promise.allSettled(unique.flatMap((email) => [
      notifyEditorsByEmail([email], message),
      sendRhNotificationEmail(email, message),
    ]));
  } catch (error) {
    console.warn('[rh] alerte contrat non envoyée', error instanceof Error ? error.message : 'erreur');
  }
}
