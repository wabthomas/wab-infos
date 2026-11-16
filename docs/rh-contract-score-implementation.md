# Mise en œuvre technique — grille d’évaluation CDD journaliste

## État du document reçu

Le dernier PDF fourni est marqué **« APPROUVÉ · 15/11/2026 »** ; il remplace, comme référence de conception, le brouillon antérieur marqué « PROJET NON ACCEPTÉ ». Les clauses de durée, missions, production, notation et barème ci-dessous reprennent cette version approuvée. L’approbation du document ne fournit toutefois pas une formule détaillée de notation que le contrat ne contient pas. Avant toute incidence de paie, faire aussi vérifier les minima et dispositions impératives par un professionnel compétent en RDC. Aucune note ne déclenche automatiquement une retenue ou une sanction.

## Traduction du contrat en données RH

Associer la grille à une **version approuvée du contrat et au collaborateur**, avec dates d’effet, devise, pondérations, seuils, montants et formule de calcul versionnés. Une évaluation mensuelle conserve un instantané de ces règles : une modification ultérieure du modèle ne recalcule jamais un mois déjà validé.

| Clause du contrat approuvé | Objet technique | Décision humaine indispensable |
|---|---|---|
| Une émission par jour, du lundi au samedi, durée maximale 30 min | Calendrier de production attendu par date et format ; réalisation reliée à l’émission/vidéo publiée et au rôle du collaborateur | Confirmer que le calendrier a été communiqué ; exclure ou annoter les annulations Direction, problèmes techniques, invités indisponibles et force majeure |
| Numérique — 40 points | Sources YouTube Studio/Analytics rattachées au canal, vidéo, période et présentateur ; vues, durée de visionnage, fidélisation et revenus attribuables | Définir précisément les objectifs et la formule de normalisation. Le contrat énumère des métriques mais ne donne ni formule, ni cible. Les revenus nécessitent un accès autorisé au canal et une attribution validée |
| Qualité journalistique — 25 points | Rubrique d’évaluation versionnée, critères et commentaire/preuve par item | Définir les critères observables, l’échelle et les évaluateurs. Ne pas faire noter la qualité par une métrique automatique ou une IA sans décision humaine |
| Production — 20 points | Comparer calendrier attendu et productions vérifiées ; tracer statut : réalisé, non réalisé, excusé/exclu, à vérifier | Valider les exceptions et la responsabilité. Une absence de vidéo ou de saisie n’est pas automatiquement une faute |
| Préparation/conduite d’entretiens — 15 points | Rubrique qualitative reliée aux émissions concernées, avec exemples et évaluateur | Définir l’échelle et la pondération entre émissions ; permettre « non applicable » avec réallocation décidée avant la période, jamais après lecture du résultat |
| Note mensuelle / 100 | Somme des quatre composantes, avec détail, preuves, auteur et horodatage | Contrôle et validation explicite de la Direction avant communication |
| Barème mensuel | Note <60 : 40 USD ; 60–69 : 50 USD ; 70–79 : 65 USD ; 80–89 : 80 USD ; 90–100 : 100 USD | Le contrat approuvé prévoit ces montants, sous réserve des minima légaux applicables. Le logiciel peut calculer le montant correspondant à la note, mais la Direction doit valider l’évaluation et Finance doit traiter le paiement séparément ; aucune retenue ou sanction automatique |
| Communication et contestation sous 5 jours ouvrables | Notification à la publication de la fiche ; horodatage de remise ; formulaire de contestation lié au mois et à la version | Définir le calendrier des jours ouvrables et l’autorité de décision. Le dossier de contestation ne modifie pas seul le montant |
| Rapport | Fiche par personne/mois et synthèse de la période : composantes, preuves, statut d’approbation/contestation, rémunération proposée puis validée | Accès restreint : collaborateur à son dossier ; RH à la revue ; Finance seulement au montant validé requis pour la paie |

## Limites actuelles de l’automatisation du score

Le contrat approuvé donne les pondérations et le barème de rémunération, mais pas la formule de conversion des métriques YouTube en points, les objectifs chiffrés, ni les rubriques qualitatives détaillées. Le système peut donc calculer automatiquement le total et le palier de rémunération **à partir de quatre notes saisies et justifiées par un évaluateur** ; il ne peut pas encore attribuer automatiquement les points YouTube, qualité, production ou entretiens. Pour automatiser ces composantes, la Direction doit publier une annexe de grille qui définit les cibles, seuils, sources, règles d’attribution et exceptions. Jusqu’à cette annexe, les points restent une décision humaine documentée, pas un calcul prétendument objectif.

## Décisions déjà retenues pour la première version

- La période est le **mois civil**.
- Les quatre composantes sont notées manuellement avec un justificatif ; le système calcule la somme et le montant du palier, sans prétendre calculer automatiquement la qualité ni les métriques YouTube.
- Le calcul déterministe des seuils est implémenté dans `src/lib/redaction/rh/contract-score.ts` et couvert par `tests/rh-contract-score.test.mjs`.

Le contrat commence et se termine en cours de mois. Le prorata ou l’application d’un forfait complet aux mois partiels n’étant pas indiqué, les évaluations de ces périodes doivent rester en revue manuelle et ne pas déclencher automatiquement un paiement jusqu’à décision explicite.

## Points à confirmer pour l’automatisation et le circuit complet

1. **YouTube** : canal de référence, attribution de chaque vidéo aux présentateurs/collaborateurs, fenêtre de mesure après publication, objectifs et accès OAuth YouTube Analytics pour les données privées/revenus.
2. **Rubriques de notation** : sous-critères concrets de qualité et d’entretiens, mode de preuve, responsable de l’évaluation et procédure pour un critère non applicable.
3. **Jours ouvrables** : inclusion du samedi, jours fériés et date de départ du délai de cinq jours après communication. Conserver l’horodatage de remise afin de calculer une échéance explicable.
4. **Montant applicable** : rapprocher le plafond de 100 USD déclaré dans le contrat, le barème qui va de 40 à 100 USD et les minima légaux applicables ; une personne compétente doit confirmer qu’il n’y a pas de conflit.

Certaines clauses ne peuvent pas être « contrôlées » automatiquement : Wab-Redaction peut conserver les communications RH faites dans son chat, mais ne peut ni vérifier l’absence de communication externe, ni décider qu’une faute disciplinaire est établie. Les principes de déontologie, la tenue, les cas de force majeure et les sanctions exigent une appréciation humaine documentée.

## Traitement des absences, déclarations et pointages

Ces événements alimentent les preuves de l’évaluation, mais ne sont pas des déductions automatiques de salaire ou de points. Les articles 6 et 7 imposent des obligations de pointage/déclaration et prévoient qu’une émission non réalisée pour une raison imputable au journaliste peut affecter la composante **Production (20 points)** ; ils précisent aussi que certaines causes externes ne constituent pas automatiquement un manquement.

| Situation observée | État technique | Effet sur le score/paiement |
|---|---|---|
| Arrivée et sortie signées | Pointage complet | Preuve de présence uniquement ; n’ajoute ni ne retire directement des points |
| Sortie manquante après l’heure de fin configurée | Pointage incomplet + rappel, puis correction/justification possible | Ne vaut pas absence et ne diminue pas automatiquement la note |
| Prestation quotidienne non déclarée | Déclaration manquante/en attente ; relance puis rapprochement avec le calendrier et les contenus | Ne prouve pas que l’émission n’a pas été produite ; ne met pas automatiquement zéro |
| Absence approuvée qui couvre une journée prévue | Journée excusée, exclue des jours attendus après validation RH | N’est pas une émission manquée imputable ; aucun point n’est retiré |
| Absence signalée mais pas encore décidée, ou pointage absent sans motif vérifié | À vérifier / revue humaine | Aucun classement automatique comme absence injustifiée ou faute |
| Émission non publiée le jour planifié | Incident de production à instruire, avec motif et éléments justificatifs | Affecte éventuellement la note production uniquement après confirmation documentée de l’imputabilité au journaliste |
| Annulation Direction, panne technique, invité indisponible, force majeure | Exception documentée et approuvée par un responsable | Exclue du dénominateur de production ; aucune pénalité automatique |

**Règle technique proposée pour Production (20 points), à approuver avant automatisation :** établir les émissions attendues à partir du calendrier communiqué ; exclure les journées d’absence approuvées et les exceptions documentées ; compter comme réalisées celles qui sont vérifiées et reliées au journaliste ; marquer les autres « à revoir ». Après décision humaine sur l’imputabilité, un calcul possible serait `20 × émissions réalisées / émissions attendues éligibles`, arrondi selon une précision approuvée. Le contrat ne prescrit pas cette formule : tant qu’elle n’est pas approuvée, le responsable saisit manuellement la note sur 20 avec justification. Si aucune émission n’est éligible sur la période, la composante est « non applicable / revue requise » et n’est ni mise à zéro ni redistribuée automatiquement. L’absence d’évidence ne devient pas une émission manquée imputable.

La présence et les déclarations peuvent figurer comme indicateurs dans le rapport de revue (complets, manquants, corrigés, excusés). Elles ne modifient le score que via une règle de notation explicitement approuvée. Une absence de pointage, une déclaration tardive ou l’absence d’un message dans le Chat ne déclenche jamais une retenue, un rejet de salaire ou une sanction automatique. Wab-Redaction peut constater ce qui est enregistré dans le système, pas ce qui s’est passé hors ligne ou dans des canaux externes.

## Flux de travail recommandé

1. **Préparer la période** : sélectionner la version contractuelle approuvée, l’objectif de production et le calendrier communiqué au collaborateur.
2. **Collecter les faits** : prestations, pointages et contenus publiés associés explicitement au collaborateur. Importer YouTube Analytics uniquement après consentement et configuration de l’accès OAuth au canal. Enregistrer date/source de collecte ; permettre une correction documentée.
3. **Préparer la note** : calculer seulement la partie numérique pour laquelle une formule approuvée existe ; saisir les évaluations qualitatives avec commentaire et preuves. Les données manquantes produisent « à compléter », pas zéro par défaut.
4. **Revue** : un gestionnaire prépare, un approbateur habilité valide. Garder la version, les événements d’audit et l’historique des changements. Verrouiller le rapport après validation ; toute correction devient une nouvelle version motivée.
5. **Communiquer** : rendre la fiche visible à la personne, avec le détail et le montant proposé/validé, puis notifier par e-mail/push. Enregistrer la date de communication qui démarre le délai contractuel configuré.
6. **Contestation** : accepter la demande dans le délai calculé avec le calendrier validé ; affecter un réviseur distinct, conserver réponse, pièces, dates et résultat. Réviser le score et le montant seulement par une décision auditable.
7. **Rapport et paie** : exporter les évaluations et la synthèse. La fiche financière validée est transmise à Finance ; le versement reste un processus séparé et confirmé. Aucun montant non approuvé ne doit apparaître comme dû ou payé.

## Architecture et contrôle d’accès à prévoir

- Une table de calendrier/attendus, une table d’évaluation mensuelle, des lignes de critères et preuves, un historique d’événements, et des contestations référencées à l’évaluation/version. Ajouter ces objets via migrations SQL RH versionnées, après sauvegarde et test de restauration.
- Enregistrer un instantané des critères et du barème à la création du mois. Une contrainte unique par collaborateur, contrat/version et période évite deux évaluations courantes ; les corrections sont versionnées plutôt qu’écrasées.
- Contrôler les autorisations côté API et SQL : le collaborateur ne lit que sa fiche ; RH prépare/revoit ; l’approbateur ne valide pas sa propre évaluation ; Finance n’accède qu’aux montants validés. Audit sans données confidentielles dans les journaux.
- Tests obligatoires : notes exactement aux seuils (59/60/69/70/79/80/89/90/100), plafond 100, période/mois, changement de règle sans recalcul historique, équipe/vidéo à plusieurs intervenants, exclusions et contestation à la limite du délai.

## Ce qui peut être réutilisé dans Wab-Redaction

L’application dispose déjà de dossiers RH, déclarations de prestations, pointages, performances vidéo liées à des collaborateurs, rémunérations, rapports, notifications et contestations. Ces éléments peuvent alimenter la fiche mensuelle comme **sources de preuve**. Le contrat approuvé permet de concevoir une évaluation à quatre notes manuelles avec justificatifs, total automatique et palier de rémunération, revue/validation de la Direction, communication au collaborateur, délai de contestation de cinq jours ouvrables et rapport exportable. L’import automatique de données YouTube et toute formule automatique de critères devront attendre la spécification des cibles et règles manquantes.
