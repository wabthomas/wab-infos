export type RhNotificationType =
  | 'absence'
  | 'absence_approved'
  | 'absence_rejected'
  | 'prestation'
  | 'prestation_approved'
  | 'prestation_rejected'
  | 'remuneration'
  | 'retrait'
  | 'service_card'
  | 'attendance_correction'
  | 'attendance_correction_requested'
  | 'dispute'
  | 'dispute_created'
  | 'historical'
  | 'document_available';

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
    case 'absence_approved':
      return 'Votre demande de congé a été approuvée. Consultez le détail dans Mon espace RH.';
    case 'absence_rejected':
      return 'Votre demande de congé a été refusée. Le motif est disponible dans Mon espace RH.';
    case 'prestation':
    case 'prestation_approved':
      return 'Votre déclaration de prestation a été validée. Consultez-la dans Mon espace RH.';
    case 'prestation_rejected':
      return 'Votre déclaration a été refusée. Le motif est disponible dans Mon espace RH.';
    case 'remuneration':
      return 'Votre rémunération a été validée. Ouvrez Mon espace RH pour la consulter.';
    case 'retrait':
      return 'Votre retrait a été traité. Ouvrez Mon espace RH pour le détail.';
    case 'service_card':
      return 'Votre carte de service est disponible dans votre espace RH.';
    case 'attendance_correction':
      return 'Votre demande de correction de pointage a été traitée.';
    case 'attendance_correction_requested':
      return 'Votre demande de correction a été enregistrée et attend validation.';
    case 'dispute':
      return 'Votre contestation a reçu une réponse.';
    case 'dispute_created':
      return 'Votre contestation a bien été enregistrée. Elle sera examinée par l’administration.';
    case 'document_available':
      return 'Un nouveau document est disponible dans votre espace Documents RH.';
    case 'historical':
      return 'Ouvrez Mon espace RH pour consulter votre ancien paiement.';
  }
}

/** Contenu d'une alerte push : jamais de montant, de motif ni de détail financier. */
export function rhNotificationPush(type: RhNotificationType): { title: string; body: string; url: string } {
  const titles: Record<RhNotificationType, string> = {
    absence: 'Demande d’absence traitée',
    absence_approved: 'Congé approuvé',
    absence_rejected: 'Congé refusé',
    prestation: 'Déclaration traitée',
    prestation_approved: 'Prestation validée',
    prestation_rejected: 'Prestation refusée',
    remuneration: 'Salaire disponible',
    retrait: 'Retrait traité',
    service_card: 'Votre carte de service est disponible',
    attendance_correction: 'Correction de pointage traitée',
    attendance_correction_requested: 'Correction de pointage demandée',
    dispute: 'Contestation traitée',
    dispute_created: 'Contestation déposée',
    historical: 'Paiement historique réglé',
    document_available: 'Document RH disponible',
  };
  const urls: Partial<Record<RhNotificationType, string>> = {
    service_card: '/mon-rh/carte-service',
    attendance_correction: '/mon-rh/presence',
    attendance_correction_requested: '/mon-rh/presence',
    dispute: '/mon-rh/contestations',
    dispute_created: '/mon-rh/contestations',
    historical: '/mon-rh/paiements-anciens',
    remuneration: '/mon-rh/remunerations',
    retrait: '/mon-rh/retraits',
    document_available: '/mon-rh/documents',
  };
  return { title: titles[type], body: rhNotificationMessage(type), url: urls[type] ?? '/mon-rh/notifications' };
}

export type RhManagerEventType = 'prestation' | 'absence' | 'retrait' | 'contestation' | 'contract' | 'document';

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
    contract: {
      title: 'Contrat signé à approuver',
      body: 'Un collaborateur a signé son contrat. Ouvrez RH → Contrats pour l’approuver.',
      url: '/rh/contrats',
    },
    document: {
      title: 'Document déposé',
      body: 'Un collaborateur a déposé un document RH. Ouvrez RH → Documents pour le consulter.',
      url: '/rh/documents',
    },
  };
  return map[type];
}
