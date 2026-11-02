export type RhNotificationType = 'absence' | 'prestation' | 'remuneration' | 'retrait' | 'service_card' | 'attendance_correction';
export interface RhNotification { id: string; type: RhNotificationType; createdAt: string; readAt: string | null }
/** Les notifications ne contiennent jamais de montant, motif ou information financiÃ¨re. */
export function rhNotificationMessage(type: RhNotificationType): string {
  switch (type) {
    case 'absence': return 'Votre demande dâ€™absence a Ã©tÃ© traitÃ©e.';
    case 'prestation': return 'Votre dÃ©claration de prestation a Ã©tÃ© traitÃ©e.';
    case 'remuneration':
    case 'retrait': return 'Une information RH a Ã©tÃ© mise Ã  jour.';
    case 'service_card': return 'Votre carte de service est disponible dans votre espace RH.';
    case 'attendance_correction': return 'Votre demande de correction de pointage a Ã©tÃ© traitÃ©e.';
  }
}
/** Contenu dâ€™une alerte push : jamais de montant, de motif ni de dÃ©tail financier. */
export function rhNotificationPush(type: RhNotificationType): { title: string; body: string; url: string } {
  const titles: Record<RhNotificationType, string> = {
    absence: 'Demande dâ€™absence traitÃ©e',
    prestation: 'DÃ©claration traitÃ©e',
    remuneration: 'RÃ©munÃ©ration mise Ã  jour',
    retrait: 'Demande de retrait mise Ã  jour',
    service_card: 'Votre carte de service est disponible',
    attendance_correction: 'Correction de pointage traitÃ©e',
  };
  const url = type === 'service_card' ? '/mon-rh/carte-service' : type === 'attendance_correction' ? '/mon-rh/presence' : '/mon-rh/notifications';
  return { title: titles[type], body: rhNotificationMessage(type), url };
}

export type RhManagerEventType = 'prestation' | 'absence' | 'retrait' | 'contestation';
/** Alerte push pour les gestionnaires RH lors d'une nouvelle demande. */
export function rhManagerPush(type: RhManagerEventType): { title: string; body: string; url: string } {
  const map: Record<RhManagerEventType, { title: string; body: string; url: string }> = {
    prestation: { title: 'Nouvelle déclaration de prestation', body: 'Une journée a été déclarée et attend votre validation.', url: '/rh/prestations' },
    absence: { title: 'Nouvelle demande d’absence', body: 'Une demande de congé ou d’absence attend votre décision.', url: '/rh/conges' },
    retrait: { title: 'Nouvelle demande de retrait', body: 'Une demande de retrait attend votre traitement.', url: '/rh/retraits' },
    contestation: { title: 'Nouvelle contestation RH', body: 'Un collaborateur a signalé un désaccord.', url: '/rh/contestations' },
  };
  return map[type];
}