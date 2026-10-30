export type RhNotificationType = 'absence' | 'prestation' | 'remuneration' | 'retrait' | 'service_card';
export interface RhNotification { id: string; type: RhNotificationType; createdAt: string; readAt: string | null }
/** Les notifications ne contiennent jamais de montant, motif ou information financière. */
export function rhNotificationMessage(type: RhNotificationType): string {
  switch (type) {
    case 'absence': return 'Votre demande d’absence a été traitée.';
    case 'prestation': return 'Votre déclaration de prestation a été traitée.';
    case 'remuneration':
    case 'retrait': return 'Une information RH a été mise à jour.';
    case 'service_card': return 'Votre carte de service est disponible dans votre espace RH.';
  }
}
/** Contenu d’une alerte push : jamais de montant, de motif ni de détail financier. */
export function rhNotificationPush(type: RhNotificationType): { title: string; body: string; url: string } {
  const titles: Record<RhNotificationType, string> = {
    absence: 'Demande d’absence traitée',
    prestation: 'Déclaration traitée',
    remuneration: 'Rémunération mise à jour',
    retrait: 'Demande de retrait mise à jour',
    service_card: 'Votre carte de service est disponible',
  };
  return { title: titles[type], body: rhNotificationMessage(type), url: type === 'service_card' ? '/mon-rh/carte-service' : '/mon-rh/notifications' };
}
