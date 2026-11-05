import type { OfficialTemplate } from './official-documents';

export type AdministrativePreset = OfficialTemplate & { category: 'Attestations' | 'Recommandations' | 'Stages et recherche' | 'Courriers' | 'Gestion du personnel'; description: string };

/** Trames éditables, non émises : aucune donnée personnelle ni attestation de faits inventée. */
export const ADMINISTRATIVE_PRESETS: readonly AdministrativePreset[] = [
  {
    id: 'preset:service-rendu', kind: 'lettre', category: 'Attestations', version: 1,
    title: 'Attestation de service rendu', subject: 'Attestation de service rendu – {{Nom complet}}', description: 'Confirmer une prestation réellement accomplie, après vérification du dossier.',
    body: 'Nous attestons, sur la base des pièces disponibles dans nos archives, que {{Nom complet}} a réalisé pour notre entreprise la prestation suivante : {{Nature précise du service}}.\n\nCette prestation a été effectuée du {{Date de début}} au {{Date de fin}}, dans le cadre de {{Cadre de la mission}}.\n\nLa présente attestation constate uniquement les services effectivement vérifiés. Elle est délivrée à la demande de l’intéressé(e), pour servir et valoir ce que de droit.',
  },
  {
    id: 'preset:travail', kind: 'lettre', category: 'Attestations', version: 1,
    title: 'Attestation de travail', subject: 'Attestation de travail – {{Nom complet}}', description: 'Confirmer la fonction et la période réellement constatées.',
    body: 'Nous attestons que {{Nom complet}} exerce ou a exercé la fonction de {{Fonction}} au sein de notre entreprise, du {{Date de début}} au {{Date de fin ou mention « à ce jour »}}.\n\nCette attestation est établie conformément aux informations figurant dans le dossier du personnel, à la demande de l’intéressé(e). Elle ne constitue ni une recommandation ni une attestation de rémunération.',
  },
  {
    id: 'preset:collaboration', kind: 'lettre', category: 'Attestations', version: 1,
    title: 'Attestation de collaboration', subject: 'Attestation de collaboration – {{Nom complet}}', description: 'Décrire une collaboration professionnelle sans présumer d’un contrat de travail.',
    body: 'Nous confirmons que {{Nom complet}} a collaboré avec notre entreprise dans le cadre de {{Nature de la collaboration}}, du {{Date de début}} au {{Date de fin}}.\n\nLes activités constatées ont porté sur {{Activités vérifiées}}. Cette attestation décrit les faits consignés dans nos dossiers et ne préjuge pas de la qualification juridique de la relation.',
  },
  {
    id: 'preset:presence', kind: 'lettre', category: 'Attestations', version: 1,
    title: 'Attestation de présence', subject: 'Attestation de présence – {{Nom complet}}', description: 'Mentionner uniquement les dates de présence vérifiées.',
    body: 'Nous attestons que {{Nom complet}} a été présent(e) au sein de notre entreprise le {{Date ou période}}, dans le cadre de {{Motif vérifié}}.\n\nCette mention repose sur les enregistrements disponibles et ne couvre aucune période non vérifiée. Elle est remise à la demande de l’intéressé(e).',
  },
  {
    id: 'preset:stage-fin', kind: 'lettre', category: 'Stages et recherche', version: 1,
    title: 'Attestation de fin de stage', subject: 'Attestation de stage – {{Nom complet}}', description: 'Confirmer un stage effectivement achevé et ses activités.',
    body: 'Nous attestons que {{Nom complet}}, étudiant(e) à {{Établissement}}, a effectué un stage au sein de {{Service ou département}} du {{Date de début}} au {{Date de fin}}.\n\nLes activités confiées ont notamment porté sur {{Activités vérifiées}}. La présente attestation confirme uniquement la période et les activités constatées ; elle ne vaut ni diplôme ni évaluation académique.',
  },
  {
    id: 'preset:stage-accueil', kind: 'lettre', category: 'Stages et recherche', version: 1,
    title: 'Lettre d’accueil en stage', subject: 'Accueil en stage – {{Nom complet}}', description: 'Proposer un stage sous réserve des accords et conditions applicables.',
    body: 'Nous confirmons notre accord de principe pour accueillir {{Nom complet}}, de {{Établissement}}, au sein de {{Service ou département}} pour un stage envisagé du {{Date de début}} au {{Date de fin}}.\n\nLes objectifs prévus sont {{Objectifs du stage}}. L’accueil définitif reste soumis aux documents requis, aux conditions convenues avec l’établissement et à la validation de l’entreprise. Veuillez contacter {{Contact professionnel}} pour organiser les modalités pratiques.',
  },
  {
    id: 'preset:stage-recommandation', kind: 'lettre', category: 'Recommandations', version: 1,
    title: 'Recommandation après un stage', subject: 'Recommandation de stage – {{Nom complet}}', description: 'Recommandation fondée sur une évaluation réellement approuvée.',
    body: 'Madame, Monsieur,\n\n{{Nom complet}} a effectué un stage au sein de {{Service ou département}} du {{Date de début}} au {{Date de fin}}. Dans ce cadre, {{Prénom}} a participé à {{Travaux vérifiés}}.\n\nSur la base de notre évaluation, nous retenons {{Qualités ou résultats vérifiés}}. Nous recommandons sa candidature pour {{Objet de la recommandation}}, sous réserve de votre propre appréciation.\n\nNous restons disponibles pour confirmer les informations mentionnées.',
  },
  {
    id: 'preset:passage-entreprise', kind: 'lettre', category: 'Recommandations', version: 1,
    title: 'Recommandation après un passage dans l’entreprise', subject: 'Recommandation professionnelle – {{Nom complet}}', description: 'Stage, mission ou collaboration : préciser le cadre exact.',
    body: 'Madame, Monsieur,\n\nNous confirmons que {{Nom complet}} a été accueilli(e) au sein de notre entreprise dans le cadre de {{Stage, mission ou collaboration}}, du {{Date de début}} au {{Date de fin}}. Ses activités ont concerné {{Travaux vérifiés}}.\n\nCompte tenu de {{Appréciation factuelle validée}}, nous soutenons sa candidature à {{Opportunité visée}}. Cette recommandation reflète notre expérience directe et ne dispense pas le destinataire de ses vérifications.',
  },
  {
    id: 'preset:recherche-recommandation', kind: 'lettre', category: 'Recommandations', version: 1,
    title: 'Recommandation pour recherche scientifique', subject: 'Recommandation de recherche – {{Nom complet}}', description: 'Attester un passage ou des travaux de recherche réellement suivis.',
    body: 'Madame, Monsieur,\n\n{{Nom complet}}, rattaché(e) à {{Établissement}}, a mené au sein de notre entreprise des activités liées à {{Sujet de recherche}} du {{Date de début}} au {{Date de fin}}. Nous avons pu constater {{Travaux ou résultats vérifiés}}.\n\nAu regard de {{Appréciation validée}}, nous appuyons sa démarche auprès de {{Destinataire ou établissement}}. Cette lettre ne vaut ni validation scientifique des résultats ni autorisation d’accès à des données non publiques.',
  },
  {
    id: 'preset:recherche-accueil', kind: 'lettre', category: 'Stages et recherche', version: 1,
    title: 'Attestation d’accueil pour recherche', subject: 'Accueil d’une recherche – {{Nom complet}}', description: 'Confirmer le périmètre convenu d’une recherche dans l’entreprise.',
    body: 'Nous confirmons notre accord de principe pour accueillir {{Nom complet}}, de {{Établissement}}, dans le cadre de la recherche intitulée {{Sujet de recherche}}, pendant la période envisagée du {{Date de début}} au {{Date de fin}}.\n\nLe périmètre autorisé se limite à {{Périmètre convenu}}. Tout entretien, toute collecte de données ou utilisation de documents reste soumis aux consentements, règles de confidentialité et autorisations applicables.',
  },
  {
    id: 'preset:mission', kind: 'lettre', category: 'Gestion du personnel', version: 1,
    title: 'Lettre de mission interne', subject: 'Mission professionnelle – {{Nom complet}}', description: 'Préciser la mission, la période et le responsable sans conférer d’habilitation publique.',
    body: 'Nous confions à {{Nom complet}}, exerçant la fonction de {{Fonction}}, la mission suivante : {{Objet précis de la mission}}.\n\nCette mission se déroule du {{Date de début}} au {{Date de fin}}, à {{Lieu}}, sous la coordination de {{Responsable}}. Elle est limitée aux activités approuvées par l’entreprise et ne constitue pas une accréditation auprès des autorités publiques.',
  },
  {
    id: 'preset:fin-collaboration', kind: 'lettre', category: 'Gestion du personnel', version: 1,
    title: 'Attestation de fin de collaboration', subject: 'Fin de collaboration – {{Nom complet}}', description: 'Constater une période terminée, sans certifier de solde de tout compte.',
    body: 'Nous attestons que la collaboration de {{Nom complet}} avec notre entreprise, dans le cadre de {{Nature de la collaboration}}, s’est déroulée du {{Date de début}} au {{Date de fin}}.\n\nLe présent document constate uniquement la période et le cadre indiqués. Il ne vaut ni reçu pour solde de tout compte ni renonciation aux droits de l’une ou l’autre partie.',
  },
  {
    id: 'preset:convocation', kind: 'lettre', category: 'Courriers', version: 1,
    title: 'Convocation à une réunion', subject: 'Convocation à une réunion – {{Objet}}', description: 'Indiquer une date, un lieu et un objet précis.',
    body: 'Madame, Monsieur,\n\nNous vous invitons à participer à une réunion consacrée à {{Objet de la réunion}}, prévue le {{Date et heure}} à {{Lieu ou lien de connexion}}.\n\nMerci de confirmer votre disponibilité auprès de {{Contact professionnel}}. Le cas échéant, veuillez préparer {{Documents à apporter ou « aucun »}}.\n\nVeuillez agréer, Madame, Monsieur, l’expression de nos salutations distinguées.',
  },
  {
    id: 'preset:accuse-reception', kind: 'lettre', category: 'Courriers', version: 1,
    title: 'Accusé de réception', subject: 'Accusé de réception – {{Objet du document reçu}}', description: 'Confirmer la réception sans préjuger de l’acceptation du contenu.',
    body: 'Madame, Monsieur,\n\nNous accusons réception de votre {{Document ou demande}} en date du {{Date de réception}}, concernant {{Objet}}.\n\nCe courrier confirme uniquement sa réception. Il ne vaut ni acceptation ni décision sur le fond. Votre demande sera examinée par {{Service concerné}} et une réponse vous sera communiquée selon les procédures applicables.\n\nVeuillez agréer nos salutations distinguées.',
  },
  {
    id: 'preset:demande-pieces', kind: 'lettre', category: 'Courriers', version: 1,
    title: 'Demande de pièces complémentaires', subject: 'Pièces complémentaires – {{Référence du dossier}}', description: 'Demander uniquement les pièces nécessaires au traitement du dossier.',
    body: 'Madame, Monsieur,\n\nAfin de poursuivre l’examen de {{Objet du dossier}}, nous vous prions de nous transmettre les pièces suivantes : {{Liste précise des pièces}}.\n\nMerci de les communiquer à {{Contact ou canal sécurisé}} avant le {{Date souhaitée}}. Ne transmettez pas de données personnelles sans nécessité ni par un canal non sécurisé.\n\nNous vous remercions de votre coopération.',
  },
  {
    id: 'preset:reponse-candidature', kind: 'lettre', category: 'Courriers', version: 1,
    title: 'Réponse à une candidature', subject: 'Suite à votre candidature – {{Poste}}', description: 'Accuser réception ou communiquer une décision effectivement prise.',
    body: 'Madame, Monsieur,\n\nNous vous remercions pour votre candidature au poste de {{Poste}}, reçue le {{Date de réception}}. Après examen de votre dossier, nous vous informons que {{Décision effectivement prise et prochaine étape}}.\n\nNous vous remercions de l’intérêt porté à notre entreprise et restons disponibles pour toute information relative à cette procédure.\n\nVeuillez agréer nos salutations distinguées.',
  },
  {
    id: 'preset:demande-rendez-vous', kind: 'lettre', category: 'Courriers', version: 1,
    title: 'Demande de rendez-vous', subject: 'Demande de rendez-vous – {{Objet}}', description: 'Proposer une rencontre sans présumer d’un engagement.',
    body: 'Madame, Monsieur,\n\nNous souhaiterions convenir d’un rendez-vous afin d’échanger sur {{Objet}}. Nous proposons la date du {{Date et heure proposées}} à {{Lieu ou modalité à distance}}.\n\nPourriez-vous confirmer votre disponibilité ou nous proposer un autre créneau auprès de {{Contact professionnel}} ?\n\nNous vous remercions par avance pour votre réponse.',
  },
];

export function unresolvedAdministrativeFields(subject: string, body: string): string[] {
  return [...new Set(`${subject}\n${body}`.match(/\{\{[^{}\n]{1,90}\}\}/g) ?? [])];
}
