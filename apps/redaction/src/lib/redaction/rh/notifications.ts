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
