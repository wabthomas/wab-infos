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

export interface RhNotificationContent {
  title: string;
  body: string;
  url: string;
  /** Sujet d'e-mail sans le préfixe [WAB RH], ajouté par le transport. */
  subject?: string;
  ctaLabel?: string;
  audience?: 'employee' | 'manager';
}

/** Les notifications ne contiennent jamais de montant, motif ni information financière. */
export function rhNotificationMessage(type: RhNotificationType): string {
  switch (type) {
    case 'absence':
      return 'Votre demande d’absence a été traitée. Consultez le détail dans votre espace RH.';
    case 'absence_approved':
      return 'Votre demande de congé a été approuvée. Consultez les dates et le détail dans votre espace RH.';
    case 'absence_rejected':
      return 'Votre demande de congé n’a pas été approuvée. Le motif est disponible dans votre espace RH.';
    case 'prestation':
      return 'Votre déclaration de prestation a bien été enregistrée. Elle attend maintenant la validation du service RH.';
    case 'prestation_approved':
      return 'Votre prestation a été validée par le service RH. Consultez le détail dans votre espace RH.';
    case 'prestation_rejected':
      return 'Votre déclaration de prestation n’a pas été validée. Le motif est disponible dans votre espace RH.';
    case 'remuneration':
      return 'Votre rémunération a été validée. Consultez le détail dans votre espace RH.';
    case 'retrait':
      return 'Le traitement de votre demande de retrait est terminé. Consultez le détail dans votre espace RH.';
    case 'service_card':
      return 'Votre carte de service a été émise. Vous pouvez la consulter et la télécharger depuis votre espace RH.';
    case 'attendance_correction':
      return 'Votre demande de correction de pointage a reçu une décision. Consultez le détail dans votre espace RH.';
    case 'attendance_correction_requested':
      return 'Votre demande de correction de pointage a bien été transmise au service RH. Elle attend une validation.';
    case 'dispute':
      return 'Le service RH a répondu à votre contestation. Consultez la réponse dans votre espace RH.';
    case 'dispute_created':
      return 'Nous avons bien reçu votre contestation. Elle sera examinée par le service RH.';
    case 'document_available':
      return 'Un nouveau document a été ajouté à votre espace Documents RH. Consultez-le dès que possible.';
    case 'historical':
      return 'Votre paiement historique a été enregistré. Consultez le détail dans votre espace RH.';
  }
}

/** Contenu d'une alerte push : jamais de montant, de motif ni de détail financier. */
export function rhNotificationPush(type: RhNotificationType): RhNotificationContent {
  const content: Record<RhNotificationType, Omit<RhNotificationContent, 'body'>> = {
    absence: { title: 'Votre demande d’absence a été traitée', subject: 'Demande d’absence traitée', url: '/mon-rh/conges', ctaLabel: 'Voir ma demande', audience: 'employee' },
    absence_approved: { title: 'Votre demande de congé est approuvée', subject: 'Votre demande de congé est approuvée', url: '/mon-rh/conges', ctaLabel: 'Voir mon congé', audience: 'employee' },
    absence_rejected: { title: 'Votre demande de congé n’a pas été approuvée', subject: 'Votre demande de congé n’a pas été approuvée', url: '/mon-rh/conges', ctaLabel: 'Consulter la décision', audience: 'employee' },
    prestation: { title: 'Votre déclaration a bien été enregistrée', subject: 'Votre déclaration de prestation est enregistrée', url: '/mon-rh/prestations', ctaLabel: 'Suivre ma déclaration', audience: 'employee' },
    prestation_approved: { title: 'Votre prestation est validée', subject: 'Votre prestation est validée', url: '/mon-rh/prestations', ctaLabel: 'Voir ma prestation', audience: 'employee' },
    prestation_rejected: { title: 'Votre déclaration n’a pas été validée', subject: 'Votre déclaration de prestation n’a pas été validée', url: '/mon-rh/prestations', ctaLabel: 'Consulter la décision', audience: 'employee' },
    remuneration: { title: 'Votre rémunération est disponible', subject: 'Votre rémunération est disponible', url: '/mon-rh/remunerations', ctaLabel: 'Voir ma rémunération', audience: 'employee' },
    retrait: { title: 'Votre retrait a été traité', subject: 'Votre retrait a été traité', url: '/mon-rh/retraits', ctaLabel: 'Voir mon retrait', audience: 'employee' },
    service_card: { title: 'Votre carte de service est disponible', subject: 'Votre carte de service est disponible', url: '/mon-rh/carte-service', ctaLabel: 'Voir ma carte', audience: 'employee' },
    attendance_correction: { title: 'Votre correction de pointage a été traitée', subject: 'Votre correction de pointage a été traitée', url: '/mon-rh/presence', ctaLabel: 'Voir mon pointage', audience: 'employee' },
    attendance_correction_requested: { title: 'Votre correction de pointage est enregistrée', subject: 'Votre correction de pointage est enregistrée', url: '/mon-rh/presence', ctaLabel: 'Suivre ma demande', audience: 'employee' },
    dispute: { title: 'Votre contestation a reçu une réponse', subject: 'Votre contestation a reçu une réponse', url: '/mon-rh/contestations', ctaLabel: 'Lire la réponse', audience: 'employee' },
    dispute_created: { title: 'Votre contestation a été enregistrée', subject: 'Votre contestation a été enregistrée', url: '/mon-rh/contestations', ctaLabel: 'Suivre ma contestation', audience: 'employee' },
    historical: { title: 'Votre paiement historique est disponible', subject: 'Votre paiement historique est disponible', url: '/mon-rh/paiements-anciens', ctaLabel: 'Voir le paiement', audience: 'employee' },
    document_available: { title: 'Un nouveau document est disponible', subject: 'Un nouveau document est disponible', url: '/mon-rh/documents', ctaLabel: 'Ouvrir mes documents', audience: 'employee' },
  };
  return { ...content[type], body: rhNotificationMessage(type) };
}

export type RhManagerEventType = 'prestation' | 'absence' | 'retrait' | 'contestation' | 'contract' | 'document';

/** Alerte push et e-mail pour les gestionnaires RH lors d'une nouvelle demande. */
export function rhManagerPush(type: RhManagerEventType): RhNotificationContent {
  const map: Record<RhManagerEventType, RhNotificationContent> = {
    prestation: {
      title: 'Une prestation attend votre validation',
      subject: 'Prestation à valider',
      body: 'Un collaborateur a déclaré une journée de prestation. Vérifiez les informations avant de valider ou de refuser.',
      ctaLabel: 'Valider la prestation',
      url: '/rh/prestations',
      audience: 'manager',
    },
    absence: {
      title: 'Une demande de congé attend votre décision',
      subject: 'Demande de congé à traiter',
      body: 'Un collaborateur a déposé une demande d’absence. Consultez les dates avant de statuer.',
      ctaLabel: 'Traiter la demande',
      url: '/rh/conges',
      audience: 'manager',
    },
    retrait: {
      title: 'Une demande de retrait attend votre traitement',
      subject: 'Retrait à traiter',
      body: 'Un collaborateur a demandé un retrait. Le détail est disponible dans l’espace RH sécurisé.',
      ctaLabel: 'Ouvrir les retraits',
      url: '/rh/retraits',
      audience: 'manager',
    },
    contestation: {
      title: 'Une contestation a été déposée',
      subject: 'Contestation à examiner',
      body: 'Un collaborateur a signalé un désaccord. Consultez le dossier pour y répondre.',
      ctaLabel: 'Ouvrir la contestation',
      url: '/rh/contestations',
      audience: 'manager',
    },
    contract: {
      title: 'Un contrat attend votre validation',
      subject: 'Contrat à valider',
      body: 'Un collaborateur a signé son contrat. Votre approbation est nécessaire pour le finaliser.',
      ctaLabel: 'Ouvrir les contrats à valider',
      url: '/rh/contrats',
      audience: 'manager',
    },
    document: {
      title: 'Un collaborateur a déposé un document',
      subject: 'Document à consulter',
      body: 'Un collaborateur a ajouté un document dans son espace RH. Consultez-le pour vérifier s’il nécessite un traitement.',
      ctaLabel: 'Ouvrir les documents',
      url: '/rh/documents',
      audience: 'manager',
    },
  };
  return map[type];
}
