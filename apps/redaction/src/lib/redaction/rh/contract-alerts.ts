import 'server-only';
import { getRhFlags } from './flags';
import type { RhNotificationContent } from './notifications';

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
    const messages: Record<ContractAlertEvent, RhNotificationContent> = {
      proposed: {
        title: 'Votre contrat est prêt à être signé',
        subject: 'Votre contrat est prêt à signer',
        body: 'Votre contrat a été préparé par le service RH. Relisez-le puis signez-le en ligne.',
        ctaLabel: 'Lire et signer mon contrat',
        url: '/mon-rh/contrats',
        audience: 'employee',
      },
      signed: {
        title: 'Un contrat attend votre validation',
        subject: 'Contrat à valider',
        body: 'Un collaborateur a signé son contrat. Votre approbation est nécessaire pour le finaliser.',
        ctaLabel: 'Ouvrir les contrats à valider',
        url: '/rh/contrats',
        audience: 'manager',
      },
      signedEmployee: {
        title: 'Votre signature a bien été enregistrée',
        subject: 'Signature enregistrée — contrat en attente de validation',
        body: 'Le contrat est maintenant en attente de validation par le service RH. Vous serez notifié dès qu’il sera validé.',
        ctaLabel: 'Suivre mon contrat',
        url: '/mon-rh/contrats',
        audience: 'employee',
      },
      approved: {
        title: 'Votre contrat est validé',
        subject: 'Votre contrat est validé',
        body: 'Votre contrat a été validé par le service RH. Vous pouvez le consulter à tout moment.',
        ctaLabel: 'Consulter mon contrat',
        url: '/mon-rh/contrats',
        audience: 'employee',
      },
      termAdmin: {
        title: 'Un contrat CDD arrive à échéance',
        subject: 'Échéance CDD proche',
        body: 'Un contrat CDD arrive à échéance. Vérifiez s’il doit être renouvelé ou clôturé.',
        ctaLabel: 'Ouvrir les contrats',
        url: '/rh/contrats',
        audience: 'manager',
      },
      term: {
        title: 'Votre contrat CDD arrive à échéance',
        subject: 'Votre CDD arrive à échéance',
        body: 'Votre contrat CDD arrive à son terme. Le service RH vous contactera si un renouvellement est prévu.',
        ctaLabel: 'Voir mon contrat',
        url: '/mon-rh/contrats',
        audience: 'employee',
      },
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
