import 'server-only';
import { getRhFlags } from './flags';

/** Generic push: never include collaborator identity, dates, salary or contract clauses. */
export async function pushContractAlert(emails: (string | null | undefined)[], event: 'proposed' | 'signed' | 'approved' | 'term' | 'termAdmin'): Promise<void> {
  try {
    const flags = await getRhFlags();
    if (!flags.contractsEnabled || !flags.notificationsEnabled) return;
    const { notifyEditorsByEmail } = await import('../web-push');
    const messages = {
      proposed:{ title:'Contrat à examiner', body:'Un contrat est disponible dans votre espace RH.', url:'/mon-rh/contrats' },
      signed:{ title:'Contrat soumis pour approbation', body:'Un contrat signé attend une décision RH.', url:'/rh/contrats' },
      approved:{ title:'Contrat approuvé', body:'Le suivi de votre contrat a été mis à jour.', url:'/mon-rh/contrats' },
      termAdmin:{ title:'Échéance de contrat', body:'Un contrat à durée déterminée approche de son terme. Consultez la gestion RH.', url:'/rh/contrats' },
      term:{ title:'Échéance de contrat', body:'Un contrat à durée déterminée approche de son terme. Consultez votre espace RH.', url:'/mon-rh/contrats' },
    } as const;
    const unique = [...new Set(emails.filter((email): email is string => !!email?.trim()).map(email => email.toLowerCase()))];
    if (unique.length) await notifyEditorsByEmail(unique, messages[event]);
  } catch (error) { console.warn('[rh] alerte contrat non envoyée', error instanceof Error ? error.message : 'erreur'); }
}
