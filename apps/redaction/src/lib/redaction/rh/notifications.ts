export type RhNotificationType =
  | 'absence'
  | 'prestation'
  | 'remuneration'
  | 'retrait'
  | 'service_card'
  | 'attendance_correction'
  | 'dispute'
  | 'historical';

export interface RhNotification {
  id: string;
  type: RhNotificationType;
  createdAt: string;
  readAt: string | null;
}

/** Les notifications ne contiennent jamais de montant, motif ni information financière. */
export function rhNotificationMessage(type: RhNotificationType): string {
  switch (type) {
    case 'absence':
      return 'Votre demande d’absence a été traitée.';
    case 'prestation':
      return 'Votre déclaration de prestation a été traitée.';
    case 'remuneration':
      return 'Votre rémunération a été validée. Ouvrez Mon espace RH pour la consulter.';
    case 'retrait':
      return 'Votre retrait a été traité. Ouvrez Mon espace RH pour le détail.';
    case 'service_card':
      return 'Votre carte de service est disponible dans votre espace RH.';
    case 'attendance_correction':
      return 'Votre demande de correction de pointage a été traitée.';
    case 'dispute':
      return 'Votre contestation a reçu une réponse.';
    case 'historical':
      return 'Ouvrez Mon espace RH pour consulter votre ancien paiement.';
  }
}

/** Contenu d’une alerte push : jamais de montant, de motif ni de détail financier. */
export function rhNotificationPush(type: RhNotificationType): { title: string; body: string; url: string } {
  const titles: Record<RhNotificationType, string> = {
    absence: 'Demande d’absence traitée',
    prestation: 'Déclaration traitée',
    remuneration: 'Salaire disponible',
    retrait: 'Retrait traité',
    service_card: 'Votre carte de service est disponible',
    attendance_correction: 'Correction de pointage traitée',
    dispute: 'Contestation traitée',
    historical: 'Paiement historique réglé',
  };
  const url =
    type === 'service_card'
      ? '/mon-rh/carte-service'
      : type === 'attendance_correction'
        ? '/mon-rh/presence'
        : type === 'dispute'
          ? '/mon-rh/contestations'
          : type === 'historical'
            ? '/mon-rh/paiements-anciens'
            : type === 'remuneration'
              ? '/mon-rh/remunerations'
              : type === 'retrait'
                ? '/mon-rh/retraits'
                : '/mon-rh/notifications';
  return { title: titles[type], body: rhNotificationMessage(type), url };
}

export type RhManagerEventType = 'prestation' | 'absence' | 'retrait' | 'contestation';

/** Alerte push pour les gestionnaires RH lors d'une nouvelle demande. */
export function rhManagerPush(type: RhManagerEventType): { title: string; body: string; url: string } {
  const map: Record<RhManagerEventType, { title: string; body: string; url: string }> = {
    prestation: {
      title: 'Nouvelle déclaration de prestation',
      body: 'Une journée a été déclarée et attend votre validation.',
      url: '/rh/prestations',
    },
    absence: {
      title: 'Nouvelle demande d’absence',
      body: 'Une demande de congé ou d’absence attend votre décision.',
      url: '/rh/conges',
    },
    retrait: {
      title: 'Nouvelle demande de retrait',
      body: 'Un collaborateur a demandé un retrait. Ouvrez RH → Retraits.',
      url: '/rh/retraits',
    },
    contestation: {
      title: 'Nouvelle contestation RH',
      body: 'Un collaborateur a signalé un désaccord.',
      url: '/rh/contestations',
    },
  };
  return map[type];
}
