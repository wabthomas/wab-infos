export type RhNotificationType = 'absence' | 'prestation' | 'remuneration' | 'retrait';
export interface RhNotification { id: string; type: RhNotificationType; createdAt: string; readAt: string | null }
/** Les notifications ne contiennent jamais de montant, motif ou information financière. */
export function rhNotificationMessage(type: RhNotificationType): string {
  switch (type) {
    case 'absence': return 'Votre demande d’absence a été traitée.';
    case 'prestation': return 'Votre déclaration de prestation a été traitée.';
    case 'remuneration':
    case 'retrait': return 'Une information RH a été mise à jour.';
  }
}
/** Contenu d’une alerte push : jamais de montant, de motif ni de détail financier. */
export function rhNotificationPush(type: RhNotificationType): { title: string; body: string; url: string } {
  const titles: Record<RhNotificationType, string> = {
    absence: 'Demande d’absence traitée',
    prestation: 'Déclaration traitée',
    remuneration: 'Rémunération mise à jour',
    retrait: 'Demande de retrait mise à jour',
  };
  return { title: titles[type], body: rhNotificationMessage(type), url: '/mon-rh/notifications' };
}
