# Guide de conception — RH de la Rédaction

## Objet et contexte

Créer dans `apps/redaction` un module RH mobile-first en français, intégré à l'authentification existante, avec Strapi (`apps/cms`) et PostgreSQL. Couvrir la Rédaction et la Production audiovisuelle : journalistes, cadreurs, monteurs, techniciens vidéo et autres fonctions configurables. Un compte, un auteur public et un collaborateur RH sont des entités distinctes. Le pays de référence est la RDC.

Ce document est un cahier des charges, pas une affirmation de conformité juridique. Faire valider les contrats, jours fériés, horaires, congés, rémunérations, retenues, conservation des données et cas particuliers par un professionnel compétent en RDC avant leur mise en œuvre opérationnelle. Ne pas inventer de règles légales.

## Accès et sécurité

- Admin : dossiers, prestations, absences, rémunérations, ajustements, retraits et paiements. Collaborateur : ses propres données autorisées, déclarations, documents, demandes et contestations.
- Distinguer les droits RH des droits éditoriaux et de publication. Le technicien audiovisuel ne doit pas voir les dossiers des autres simplement en raison de sa fonction.
- Autoriser chaque opération et chaque objet côté serveur, y compris les appels directs au CMS, téléchargements et exports. Aucune API RH publique ; ne jamais exposer de token privilégié au navigateur. Révoquer les accès quand nécessaire.
- Un admin ne peut approuver seul son propre retrait : prévoir un second approbateur autorisé. Tracer décisions et opérations sensibles ; éviter les données confidentielles dans les logs.
- Stockage privé pour les documents et coordonnées de paiement, et non une simple URL difficile à deviner. Minimiser les données collectées ; pas de surveillance ou géolocalisation automatique.

## Périmètre fonctionnel cible

1. Tableau de bord adapté au rôle : effectifs, demandes, échéances et actions à traiter pour l'admin ; propres activités, documents, demandes et solde pour le collaborateur.
2. Dossiers : fonction, équipe, responsable, statut, dates, coordonnées autorisées, lien explicite au compte ; recherche, historique et archivage sans supprimer automatiquement le compte. Coordonnées personnelles et contacts d'urgence à accès restreint.
3. Contrats, affectations et documents : dates, échéances, historique, dépôt et téléchargement privés, contrôles de type et taille, alertes.
4. Congés et absences : demande, validation ou refus motivé, calendrier, annulation autorisée, vérification des dates et chevauchements. Règles et soldes configurables après validation ; suivi manuel en attendant.
5. Prestations : déclarations et contrôle des activités éditoriales et audiovisuelles, sans confondre absence de publication et absence de travail. Une enquête, une captation ou un montage non publié peut constituer une prestation.
6. Rémunérations : montant mensuel de référence, période, devise, prestations, ajustements, validation, montants payés et solde. Corrections des périodes validées par écritures tracées, sans réécriture silencieuse.
7. Retraits : uniquement sur un solde déjà validé et disponible, jamais sur une avance. L'admin traite la demande et enregistre le paiement réellement effectué ; pas de transfert automatique dans la première version.
8. Notifications discrètes, rapports et exports soumis aux mêmes permissions. Protéger les CSV contre les formules et journaliser leur création.

## Calendrier et journées à vérifier

Règle souhaitée : rémunération mensuelle, prestation attendue chaque jour du mois sauf le dimanche ; les jours fériés sont inclus sauf s'ils tombent un dimanche. Calculer le nombre de jours d'après le calendrier réel du mois. La règle et son application aux jours fériés et contrats doivent être validées en RDC.

Une journée sans activité enregistrée est **à vérifier**, pas automatiquement une absence injustifiée. Le collaborateur peut expliquer ou compléter ; l'admin vérifie et motive sa décision. Distinguer congés et absences justifiées. Le collaborateur peut contester.

Montant journalier indicatif = salaire mensuel de référence / nombre de jours du mois hors dimanches. Le système ne doit pas appliquer une retenue définitive sans validation juridique des règles et décision de l'admin. Distinguer prestation non effectuée et sanction financière. Définir après validation les arrivées/départs en cours de mois, arrondis et autres cas particuliers.

## Rémunérations, devises et retraits

- Gérer CDF et USD séparément ; chaque écriture possède une devise. Pas d'addition entre devises ni de conversion automatique sans règle, taux et date validés. Utiliser des montants exacts, jamais des flottants pour la comptabilité.
- Statuts cibles : en préparation, à valider, validé puis payé partiellement ou totalement. Seul un montant validé peut alimenter le solde disponible.
- Réserver atomiquement le montant d'une demande en attente ; libérer en cas de refus ou d'annulation autorisée. Empêcher les demandes concurrentes excédant le solde et les doubles paiements, y compris en cas de requêtes répétées.
- Après approbation, l'admin paie hors du système puis renseigne date, moyen et référence. Moyens envisagés : Mobile Money, virement, espèces. Une intégration de paiement exige une conception séparée.
- Sécuriser les coordonnées de paiement et tracer leurs modifications. Prévoir des écritures et historiques immuables, les corrections et rapprochements.

## Phasage et critères de livraison

1. Audit des mécanismes existants, matrice des droits, choix du stockage et validation métier/juridique.
2. Calendrier et règles de référence testés, sans données personnelles ni retenue automatique.
3. Dossiers, rôles et stockage privé, avec tests d'accès direct et migrations réversibles.
4. Prestations et absences, décisions motivées et audit.
5. Rémunérations, écritures exactes et retraits transactionnels, après validation des règles et de la sécurité.
6. Notifications, rapports et tests de bout en bout, documentation et déploiement progressif.

Tester notamment permissions et accès à un autre dossier, calcul du calendrier (y compris fériés et dimanches), absence de retenue automatique, demandes concurrentes, séparation des devises, téléchargements privés, audit et non-régression de la Rédaction. Documenter sauvegardes, migrations, retour arrière, configuration et limites. Ne pas présenter les étapes futures comme réalisées.

## État actuel

Étapes présentes : calendrier indicatif, simulateur local, dossiers professionnels, relevés de prestation et demandes d’absence administrateur, exports CSV RH journalisés, et espace personnel avec déclarations de prestation pour les comptes liés. Les dossiers nécessitent une base RH configurée séparément. Les rémunérations manuelles sont disponibles derrière un indicateur désactivé par défaut. Le suivi expérimental des soldes et retraits est désactivé par défaut. Aucune retenue ni transfert automatique n’est effectué.

Pour vérifier le calendrier avec Node 22 : `node --import tsx --test tests/rh-*.test.mjs`.
L'écran de gestion `/rh` est accessible aux super-administrateurs de la Rédaction et, après activation explicite, aux comptes possédant un rôle RH dédié. Ces rôles sont désactivés par défaut. L'accès mobile se trouve dans Profil. L'espace personnel `/mon-rh` est limité aux comptes explicitement liés à un dossier actif.

### Simulation indicative

L'écran admin permet une simulation locale à partir d'un montant mensuel et d'une devise (CDF ou USD). Aucune donnée saisie n'est enregistrée ni transmise par cette fonctionnalité ; le résultat n'est ni un solde ni une retenue. Les calculs utilisent des entiers en centièmes, avec arrondi au centième le plus proche et moitié arrondie au-dessus. Cette précision est une convention technique provisoire, à valider avant la gestion financière réelle. Aucune conversion n'est effectuée. Vérification : `node --import tsx --test tests/rh-*.test.mjs`.

### Points techniques à traiter avant le stockage RH

L'application utilise le JWT Rédaction et peut effectuer des requêtes serveur avec un jeton Strapi privilégié ; le contrôle RH doit donc être indépendant et vérifié avant chaque accès, y compris l'accès direct à Strapi. Le rôle super-admin existant est provisoire et ne constitue pas une matrice RH dédiée. La présente étape utilise une base PostgreSQL distincte et ne crée aucune API Strapi pour les dossiers. Avant toute mise en production, contrôler les droits et la résolution des rôles Rédaction existants, la séparation des accès, les sauvegardes et les tests d’intégration. Le stockage des rémunérations et le calcul expérimental des soldes sont optionnels et désactivés par défaut.


### Mise en place des dossiers professionnels

Le service n’est pas opérationnel sans configuration : la page RH affiche une erreur et ne bascule jamais sur une base locale. Utiliser une base PostgreSQL dédiée, privée et chiffrée en transit, avec sauvegardes chiffrées et accès réseau restreint. Faire une sauvegarde puis exécuter `docs/sql/rh-initial.sql` **une seule fois** avec un rôle propriétaire. Le script crée un schéma isolé ; il ne modifie pas les tables Strapi.

Créer un compte PostgreSQL distinct pour l’application. Le propriétaire peut lui accorder uniquement `USAGE` sur le schéma `redaction_rh`, `SELECT, INSERT, UPDATE` sur `redaction_rh.collaborators`, et `INSERT` sur `redaction_rh.audit_log` (plus `USAGE, SELECT` sur la séquence d’audit si nécessaire). Ne pas donner à ce compte la propriété des tables, ni `DELETE`, `TRUNCATE` ou des droits de modification sur le journal. Limiter les droits des autres comptes, y compris ceux du CMS, et vérifier les accès effectifs.

Configurer `REDACTION_RH_DATABASE_URL` côté serveur uniquement (sans exposer le mot de passe) et `REDACTION_RH_ALLOWED_ORIGINS` en production avec les origines HTTPS exactes utilisées par les administrateurs, séparées par des virgules. Par exemple `https://wab-infos.com,https://redaction.app.wab-infos.com` ; ne pas inclure de chemin. Toute origine absente ou non autorisée refuse les écritures. Tester séparément les origines et l’authentification de l’application Android avant activation : son origine peut différer de celle du navigateur.

Les champs disponibles sont limités aux nom, prénom, fonction, équipe, statut de collaboration et date d’arrivée. Ne pas y saisir salaires, coordonnées, pièces ou informations sensibles. Créer, modifier et archiver sont réservés au super-admin Rédaction existant et journalisés dans la même transaction que la modification. Le journal conserve l’adresse de l’acteur, l’action et l’identifiant du dossier, pas les anciennes valeurs : ce n’est pas encore un historique complet des champs. L’archivage ne désactive pas le compte, mais bloque son accès au dossier lié. Les noms ne sont pas uniques ; une politique anti-doublon reste à concevoir. Les 500 premiers dossiers sont affichés.

Avant activation : auditer la résolution des rôles existants et les permissions PostgreSQL, vérifier la configuration, effectuer des tests d’intégration avec une base dédiée et définir la conservation des données et l’accès au journal. Le retour arrière applicatif consiste à retirer la configuration et revenir à la version précédente ; conserver ou restaurer les données selon la politique de sauvegarde validée. Ne pas supprimer le schéma sans validation explicite.

### Prestations — étape administrateur

Après `rh-initial.sql`, exécuter une seule fois `docs/sql/rh-prestations.sql` avec le propriétaire de la base RH et accorder au compte applicatif uniquement `SELECT, INSERT, UPDATE` sur `redaction_rh.daily_activities` (en conservant les droits précédents). Sauvegarder avant migration et vérifier les droits effectifs. Aucun accès aux tables RH n'est ajouté à Strapi.

L'admin peut saisir et corriger un relevé par collaborateur et par jour (prestation effectuée, absence signalée ou absence justifiée par l'admin). Les modifications utilisent une version pour refuser les écrasements et sont journalisées dans la même transaction, avec l'identifiant du relevé ; les anciennes valeurs ne sont pas encore conservées. Les relevés futurs sont refusés, la date de référence utilisant `Africa/Kinshasa`. Les horaires et fuseaux applicables au personnel dans l'autre fuseau de la RDC devront être confirmés avant déploiement.

Pour un collaborateur actif avec une date d'arrivée, l'écran signale les jours jusqu'à aujourd'hui sans relevé, hors dimanches. Cet indicateur exclut les absences approuvées, mais ne prend pas encore en compte les départs ou exceptions contractuelles ; il ne signifie pas qu'une absence est injustifiée. Sans date d'arrivée aucune liste n'est produite. Les collaborateurs liés peuvent déclarer leurs prestations pour vérification ; une déclaration en attente ne constitue pas encore un relevé validé. Aucune retenue n'est calculée ou appliquée. Ne pas saisir d'informations médicales dans la description.

Les tests incluent les migrations et contraintes avec PostgreSQL embarqué (PGlite), mais ne remplacent pas des tests d'intégration avec la base et les comptes réellement déployés ni des tests de sécurité HTTP. Les migrations ne sont pas automatiquement exécutées au démarrage.


### Congés et absences — étape administrateur

Après les deux migrations précédentes, sauvegarder puis exécuter une seule fois `docs/sql/rh-absences.sql` avec le propriétaire de la base ; accorder `SELECT, INSERT, UPDATE` sur `redaction_rh.absence_requests` au compte applicatif. Ne pas accorder d'accès à Strapi. Cette migration est nécessaire pour afficher les prestations puisque les absences approuvées sont prises en compte dans le repérage des jours non documentés.

L'admin saisit une demande en attente avec une catégorie libre et des dates inclusives (maximum technique de 366 jours, sans signification légale). Les demandes en attente ou approuvées ne peuvent pas se chevaucher pour un même collaborateur. L'admin peut approuver ou refuser une demande en attente, et annuler une demande en attente ou approuvée. Un motif est obligatoire pour le refus. Les modifications sont versionnées et auditées dans la même transaction ; seul le dernier motif est conservé sur la demande et l'audit ne conserve pas les motifs précédents. Les 500 demandes les plus récentes sont affichées ; la recherche des absences approuvées sur un mois n'est pas soumise à cette limite.

Les jours couverts par une absence approuvée sont exclus du repérage des journées sans déclaration. Les absences en attente, refusées ou annulées ne le sont pas. Le dispositif ne vérifie ni les droits, ni les soldes de congés, ni la conformité en RDC ; aucun calcul de rémunération ou retenue n'est déclenché. Ne saisir aucune donnée médicale ou sensible. Les collaborateurs liés peuvent soumettre leurs demandes et annuler leurs demandes en attente. La conservation complète des motifs et les tests HTTP restent à réaliser ; les rôles RH dédiés sont désactivés par défaut.


### Liaison de compte et espace personnel

Après les trois migrations précédentes, sauvegarder puis appliquer `docs/sql/rh-account-links.sql` avec le propriétaire ; accorder au compte applicatif uniquement `SELECT, INSERT, DELETE` sur `redaction_rh.account_links`, sans droit de mise à jour ni propriété. La suppression est limitée aux liaisons, et non aux collaborateurs ou au journal d'audit. Sans cette migration, l'espace personnel est inaccessible.

Dans la liste des collaborateurs actifs, l'admin ouvre « Compte », saisit l'identifiant numérique du compte **Strapi Users & Permissions**, vérifie le nom d'utilisateur et l'adresse retournés par Strapi puis confirme la liaison. La recherche nécessite un `STRAPI_API_TOKEN` serveur autorisé à lire les comptes. Ne pas confondre cet identifiant avec celui d'un auteur ou d'un compte du panneau d'administration Strapi : ces derniers ne sont pas pris en charge pour l'espace personnel. Une liaison peut être retirée par l'admin et un compte ou une adresse ne peut être lié qu'à un seul dossier. Les opérations sont auditées ; les changements concurrents utilisent la version du dossier.

L'accès personnel exige un JWT Users & Permissions valide et un compte explicitement confirmé et non bloqué : `GET /api/users/me` doit retourner `id`, `email`, `confirmed` et `blocked`. Le compte est revérifié à chaque requête RH. La correspondance exige à la fois l'identifiant et l'adresse enregistrés dans la liaison ; un changement d'adresse interrompt l'accès jusqu'à vérification et nouvelle liaison par l'admin. Un dossier archivé ou un lien supprimé n'ouvre aucun accès personnel. L'identifiant du dossier utilisé pour une demande est déterminé côté serveur, jamais choisi par le navigateur.

Une fois lié, le collaborateur trouve « Mon espace RH » dans son profil ; il peut voir uniquement ses demandes, en créer une et annuler une demande en attente. Une demande approuvée ne peut être annulée que par l'admin. L'espace personnel peut afficher les rémunérations validées si la fonctionnalité est activée ; les documents privés et les retraits expérimentaux restent désactivés par défaut. Aucun solde ni droit de congé n'est calculé.

Avant activation : vérifier en environnement de préproduction que le JWT utilisé et les champs de statut sont bien fournis par Strapi, que les rôles et jetons ont les permissions minimales, et tester deux comptes, usurpation d'identifiant, blocage, déliaison, archivage et concurrence sur la base réelle. Les tests actuels couvrent notamment les règles d'identité et des contraintes SQL sur PGlite, pas un parcours HTTP ou une revue de sécurité complète.


### Déclarations personnelles de prestations

Après les quatre migrations précédentes, sauvegarder puis exécuter `docs/sql/rh-declarations.sql` une seule fois avec le propriétaire. Accorder `SELECT, INSERT, UPDATE` sur `redaction_rh.activity_submissions` au compte applicatif ; ne pas accorder l'accès à Strapi. La table et la colonne d'audit ajoutées sont nécessaires pour utiliser cette fonctionnalité.

Un collaborateur lié peut déclarer ses activités du jour ou d'une date passée, sans choisir son identifiant RH. Le serveur vérifie l'identité et le lien actif sous verrou avant l'écriture. Une seule déclaration peut être en attente par collaborateur et par date ; si un relevé journalier existe déjà, la déclaration est refusée. Le collaborateur peut annuler une déclaration en attente ; après refus ou annulation, il peut en soumettre une nouvelle. Les dates futures sont refusées suivant `Africa/Kinshasa`.

L'admin consulte les déclarations par collaborateur et valide ou refuse, avec motif obligatoire pour un refus. La validation crée un relevé « prestation effectuée » et écrit l'audit dans la même transaction. Un relevé existant n'est jamais écrasé : l'admin doit examiner la situation avant de décider. Les versions et le verrou du dossier empêchent les décisions et annulations concurrentes de s'écraser. Les relevés saisis manuellement restent modifiables par l'admin ; la déclaration d'origine ne reflète pas ces corrections ultérieures. L'historique complet des anciennes valeurs et des motifs reste à concevoir.

La liste des jours « sans relevé validé » continue d'inclure les déclarations en attente ou refusées : ce n'est ni une absence injustifiée ni une déduction. Vérifier aussi les congés, périodes d'emploi et autres exceptions ; aucune décision automatique de paie n'est prise. Les alertes internes de gestion, si elles sont activées, signalent les nouvelles déclarations avec actualisation périodique. Les listes affichent au maximum 500 éléments récents. Ne saisir aucune donnée sensible dans les descriptions et motifs.

Les tests couvrent la validation, la migration, les contraintes d'unicité, la portée d'annulation et le non-écrasement d'un relevé existant avec PostgreSQL embarqué. Ils ne remplacent pas les tests de parcours HTTP multi-comptes, de révocation et de concurrence sur une base PostgreSQL réelle avant activation.


### Rémunérations manuelles — fonctionnalité désactivée par défaut

Cette étape prépare l'affichage des montants mensuels mais **ne constitue pas un système de paie**. Le calcul expérimental de solde dépend d'un second indicateur désactivé. Après les migrations précédentes, sauvegarder et exécuter une seule fois `docs/sql/rh-remunerations.sql` avec le propriétaire. Accorder au compte applicatif uniquement `SELECT, INSERT, UPDATE` sur `redaction_rh.remunerations` ; maintenir le journal à accès restreint, la base séparée, les sauvegardes et la connexion chiffrées. Aucune API Strapi n'expose cette table.

L'admin saisit le montant mensuel manuellement dans une devise (CDF ou USD) et crée un brouillon. Il peut annuler le brouillon ou le valider ; un seul brouillon ou montant validé existe pour une même personne, période et devise. Seuls les montants validés sont visibles par le compte lié au dossier actif. Les montants utilisent des centièmes entiers sans flottants ; aucun taux de change ou ajustement automatique n'est appliqué. La précision à deux décimales est une convention technique qui doit être validée pour chaque devise. Le traitement de paie, les calculs légaux et les retenues n'existent pas.

La validation est irréversible : les montants validés ne sont pas modifiables. Une correction du solde passe par une écriture compensatoire distincte, si les retraits expérimentaux sont activés. L'interface en avertit l'admin. Ne pas activer en production ni utiliser pour des données réelles avant de définir et tester ces mécanismes, les règles et obligations en RDC, la sécurité de bout en bout, les permissions et les sauvegardes. Pour une préproduction isolée, après migration et validation, configurer `REDACTION_RH_FINANCE_ENABLED=true` côté serveur. Toute autre valeur désactive les routes de rémunération ; le paramètre ne remplace pas les contrôles d'accès.

Le statut « validé » signifie uniquement que l'admin a confirmé le montant saisi ; il ne signifie ni payé ni conforme juridiquement. Avec les retraits expérimentaux activés, les montants postérieurs au mois de coupure s'ajoutent au solde initial manuel. Le rapprochement avec les paiements externes reste une opération manuelle à valider. Les données RH restent visibles uniquement côté admin et, pour les montants validés, par le compte lié ; l'audit note l'acteur, l'action et l'identifiant de la rémunération dans la même transaction. Les listes affichent au maximum 500 éléments. Les tests PGlite couvrent les contraintes, l'exactitude des montants et le filtrage des lectures, mais pas l'ensemble du parcours HTTP ni les accès aux systèmes réels.


### Retraits expérimentaux — ne pas activer en production

Cette fonctionnalité est un prototype **désactivé par défaut**, distinct de la simple simulation. Elle requiert `REDACTION_RH_FINANCE_ENABLED=true` ET `REDACTION_RH_WITHDRAWALS_ENABLED=true`. Ne pas activer sur des données réelles : les paiements historiques hors système ne sont pas repris, les corrections nécessitent des écritures compensatoires manuelles à vérifier, et l'autorisation fondée sur les rôles actuels doit être auditée. Une rémunération validée dans la version précédente peut déjà avoir été payée : la présenter comme disponible sans rapprochement préalable provoquerait un double paiement. Un solde initial manuel est désormais requis, mais le rapprochement avec les paiements externes, les corrections et les tests de migration restent indispensables avant production.

Pour une préproduction isolée, après toutes les migrations précédentes, sauvegarder puis exécuter `docs/sql/rh-retraits.sql` une seule fois comme propriétaire. Donner au rôle applicatif `SELECT, INSERT, UPDATE` sur `redaction_rh.withdrawals` et maintenir les permissions précédentes, y compris `INSERT` sur l'audit. Ne pas donner d'accès à Strapi. Configurer les deux indicateurs ci-dessus et les origines RH autorisées dans un environnement de test isolé.

Le solde par devise est calculé à partir du solde initial confirmé, plus les rémunérations validées postérieures au mois de coupure, plus les crédits d'ajustement validés, moins les diminutions validées et les retraits réservés (en attente ou approuvés) et payés. Sans solde initial, aucun montant disponible n'est affiché et aucun retrait n'est permis. Les brouillons n'y contribuent pas. Les sommes sont calculées séparément en CDF et USD à précision entière ; une incohérence négative rend le service indisponible. Les opérations sur un même dossier prennent le verrou du collaborateur pour sérialiser validation et réservation. Les demandes en attente sont annulables par leur propriétaire, les refus libèrent le montant. L'admin approuve, refuse avec motif, ou enregistre un paiement déjà réalisé hors système ; une référence non vide est obligatoire pour Mobile Money et virement, et une même référence ne peut être réutilisée pour le même moyen. Aucun transfert automatique ni stockage des coordonnées de paiement n'est prévu. Une opération payée n'est pas annulable ni corrigeable dans cette version.

Les demandes possèdent une clé d'idempotence pour les répétitions à l'identique pendant que le formulaire est ouvert, et les changements d'état utilisent la version pour refuser les doubles validations. La clé n'est pas conservée après rechargement ou changement de saisie : une reprise après interruption doit être rapprochée manuellement avec l'historique avant toute nouvelle demande. L'admin dont l'e-mail correspond au demandeur ou au compte actuellement lié ne peut traiter la demande ; sans lien actuel le traitement est refusé. Ce contrôle ne garantit pas à lui seul l'identification d'une même personne utilisant plusieurs comptes : une séparation des fonctions fiable et une revue d'identité restent nécessaires. Un second admin distinct doit traiter le propre retrait d'un admin.

La dernière note de décision est conservée, mais l'audit ne conserve pas encore tous les motifs antérieurs. Les 500 derniers retraits sont affichés, mais tous sont pris en compte dans le calcul. Le dispositif ne prévoit pas de notification automatique vers l’admin ni de rapprochement auprès d'un prestataire. Aucun historique de paiements externes préexistant n'est importé. Ne pas saisir de données sensibles dans les notes ou références.

Tests effectués : validations, requêtes et contraintes de base avec PGlite et contrôle TypeScript. Avant toute production : tester les transactions concurrentes et reprises après échec sur PostgreSQL réel, l'isolation entre comptes et la révocation via HTTP, la solidité de l'authentification et de l'anti-auto-approbation, les règles de rapprochement, les corrections et la validation juridique en RDC.


### Organisation de l'interface

L'espace administrateur `/rh` regroupe ses fonctions par sections (collaborateurs, prestations, congés, rémunérations, retraits, accès et sécurité). Les sections financières indiquent si leurs indicateurs de configuration sont activés, sans affirmer que les vérifications de production sont achevées. La recherche de l'annuaire porte uniquement sur les dossiers déjà chargés (maximum 500). L'espace personnel utilise des accès rapides vers les sections auxquelles l'utilisateur a accès.

La section « Accès et sécurité » permet au super-admin de consulter et attribuer les deux rôles RH prédéfinis après liaison des comptes. Les rôles sont séparés des rôles éditoriaux ; ils sont désactivés par défaut et ne constituent pas une matrice personnalisable de permissions.


### Rôles RH dédiés — préproduction

Après `rh-account-links.sql` et les autres migrations précédentes, sauvegarder puis exécuter `docs/sql/rh-roles.sql` une seule fois avec le propriétaire. Accorder au compte applicatif `SELECT, INSERT, DELETE` sur `redaction_rh.role_grants` ; conserver les droits d'insertion sur le journal d'audit. Les attributions et révocations sont réservées aux super-administrateurs Rédaction et journalisées dans la même transaction. L'interface se trouve dans « Accès et sécurité ». Un compte Users & Permissions confirmé et non bloqué doit d'abord être explicitement lié au dossier actif. La suppression du lien supprime les rôles liés ; l'archivage empêche leur utilisation.

- **Gestionnaire RH** : consulter l'annuaire professionnel et gérer dossiers, prestations et absences. Pas d'accès aux rémunérations ou retraits ; pas d'attribution de rôles ni de liaison des comptes.
- **Gestionnaire financier** : consulter l'annuaire professionnel et gérer rémunérations et retraits, seulement lorsque ces fonctionnalités sont elles-mêmes activées. Pas de modification des dossiers, ni d'accès aux prestations ou absences, ni d'attribution de rôles.
- **Super-administrateur Rédaction** : conserve les accès d'administration existants, y compris les liaisons et attributions de rôles. Un collaborateur lié sans rôle accède uniquement à son propre espace personnel. Les deux rôles RH peuvent être cumulés.

Les contrôles sont réalisés sur chaque requête aux API RH par rôle, indépendamment des éléments masqués dans l'interface. La résolution réutilise l'authentification et la détermination du super-administrateur existantes, qui doivent être auditées. Les rôles dédiés restent inactifs tant que `REDACTION_RH_ROLES_ENABLED` n'est pas exactement `true`. Le contrôle est effectué au début d'une requête : une révocation concurrente ne garantit pas l'annulation d'une opération déjà en cours. Les comptes admin Strapi ne sont pas pris en charge pour les rôles dédiés ; seule l'administration existante continue de les utiliser selon ses règles.

Ne pas activer en production avant tests multi-comptes réels, refus des accès directs, révocation concurrente, vérification des origines et revue de sécurité. Les rôles financiers ne lèvent pas les réserves relatives aux soldes, aux paiements historiques, à l'anti-auto-approbation et à la validation juridique. La fonctionnalité n'offre pas encore de permissions personnalisables, de périmètre par équipe, ni d'annuaire ou audit complet des droits ; les listes sont limitées à 500 résultats.

### Rapports et exports CSV

Après `rh-initial.sql` et les migrations utilisées par les fonctionnalités concernées, sauvegarder puis exécuter `docs/sql/rh-rapports.sql` une seule fois avec le propriétaire. Accorder au compte applicatif `INSERT` sur `redaction_rh.report_audit` (et les droits de séquence nécessaires selon la configuration PostgreSQL). Le compte applicatif n'a pas besoin du droit de modification ou suppression du journal. La lecture des journaux doit être réservée aux personnes habilitées et aux procédures d'audit. L'export échoue si l'écriture du journal échoue.

La section « Rapports » est réservée aux super-administrateurs et aux gestionnaires RH habilités. Les exports comprennent l'annuaire professionnel (y compris les dossiers archivés), les absences ou les relevés de prestation enregistrés. Les périodes des absences sont inclusives et les demandes qui chevauchent la période sont incluses ; les prestations ne comprennent pas les déclarations en attente. Le filtre équipe est exact. Les données financières, références de paiement, motifs et descriptions d'activité sont exclus ; le type d'absence est inclus et doit donc rester non sensible.

Les exports sont effectués côté serveur après vérification des droits et de l'origine ; ils sont journalisés avec acteur, type, nombre de lignes et date, sans enregistrer les données exportées. Le CSV neutralise les cellules pouvant être interprétées comme formules par un tableur. Le plafond est de 5 000 lignes : au-delà, aucun fichier partiel n'est produit ; réduire la période ou filtrer par équipe. La limitation protège le service mais les rapports volumineux et la pagination restent à concevoir. Les fichiers téléchargés contiennent des données personnelles et doivent être conservés de manière sécurisée.

Les tests couvrent les filtres, l'échappement des CSV, la migration et des requêtes sur PGlite ; la vérification HTTP avec les rôles réels, la gestion des fichiers sur Android et la stratégie de conservation des exports restent à valider avant utilisation réelle. Aucun rapport financier n'est actuellement disponible.


### Notifications RH internes

Cette fonctionnalité est désactivée par défaut. Après `rh-account-links.sql` et `rh-roles.sql`, sauvegarder puis exécuter une seule fois `docs/sql/rh-notifications.sql` avec le propriétaire de la base privée. Accorder au rôle applicatif `SELECT, INSERT, UPDATE` sur `redaction_rh.notifications` ; ne pas accorder l'accès à Strapi. Après tests en préproduction, `REDACTION_RH_NOTIFICATIONS_ENABLED=true` active à la fois la création des notifications et leur affichage. Si la migration ou les droits sont incorrects alors que l'indicateur est activé, les décisions associées échoueront : leur écriture et la notification sont dans la même transaction et sont annulées ensemble.

Les décisions sur les absences et déclarations de prestation, les rémunérations et ajustements validés ainsi que les décisions sur les retraits créent une notification interne générique pour le compte actuellement lié, s'il existe. Les messages ne contiennent ni montant, ni motif, ni référence de paiement ; les informations financières utilisent un texte RH générique. Les notifications sont consultables uniquement dans « Mon espace RH », et marquées lues individuellement. Elles ne sont ni des notifications push, ni des e-mails, et ne sont pas envoyées sur l'écran verrouillé. L'actualisation est manuelle ; seules les 100 plus récentes sont affichées. Les alertes de gestion pour les nouvelles demandes utilisent un dispositif et un indicateur distincts.

L'accès vérifie le compte Users & Permissions et le dossier actif ; un compte ne peut pas lire ni marquer les notifications d'un autre. La notification est liée à l'identité du compte au moment de l'événement et supprimée avec la liaison : un compte lié ultérieurement ne reçoit pas les notifications précédentes. Les événements survenus sans liaison ou avant activation ne sont pas reconstitués. L'archivage bloque la lecture ; une politique de conservation et suppression reste à définir.

Les tests portent sur les messages, les contraintes SQL, l'isolation par compte, la suppression en cascade et le rollback avec PGlite. Avant toute activation réelle, vérifier les droits PostgreSQL, les parcours HTTP multi-comptes, la révocation concurrente et le fonctionnement mobile.


### Documents RH privés — préproduction

Cette fonctionnalité est désactivée par défaut et ne doit pas être activée pour des données réelles avant revue de sécurité, tests complets et validation des règles de conservation. Après `rh-initial.sql`, `rh-account-links.sql` et `rh-roles.sql`, sauvegarder puis exécuter `docs/sql/rh-documents.sql` une seule fois avec le propriétaire. Accorder au rôle applicatif `SELECT, INSERT, UPDATE` sur `redaction_rh.documents`, `SELECT, INSERT` sur `redaction_rh.document_shares` et conserver `INSERT` sur le journal. Les liaisons supprimées entraînent la suppression du partage correspondant ; vérifier les permissions effectives et les cascades avec les rôles réels. En préproduction isolée, `REDACTION_RH_DOCUMENTS_ENABLED=true` active les routes et l'interface.

Les fichiers sont stockés dans la base PostgreSQL RH privée sous forme binaire, jamais dans la médiathèque publique Strapi. Cette fonctionnalité ne chiffre pas elle-même les fichiers : il faut une base et des sauvegardes chiffrées au repos, une connexion chiffrée, des accès réseau et administrateurs restreints, une capacité de stockage adaptée et des procédures de restauration testées. Les téléchargements sont servis en pièce jointe, sans mise en cache, après contrôle des droits et insertion d'un événement d'audit dans la même transaction. Le contenu n'est pas ajouté aux journaux applicatifs ; vérifier également la configuration des journaux PostgreSQL et de l'infrastructure.

Seuls les super-administrateurs peuvent déposer, lister, télécharger et archiver les documents ; les rôles gestionnaire RH et financier n'obtiennent pas cet accès. Un document est privé par défaut. L'admin peut choisir de le partager au moment du dépôt avec le compte actuellement lié au dossier ; le serveur vérifie le lien et capture explicitement cette identité. Chaque accès personnel vérifie à nouveau le compte, le lien actif, le partage et l'état du dossier et du document. Retirer la liaison supprime le partage, y compris si la fonctionnalité documentaire est désactivée : une nouvelle liaison n'accorde pas automatiquement de nouveau accès. L'interface ne permet pas encore de repartager un document existant. Les dossiers archivés et les documents archivés ne sont pas téléchargeables.

Formats acceptés : PDF, JPEG et PNG, 5 Mo maximum. La vérification des signatures et de la taille n'est **pas** une analyse antivirus ni une garantie que le contenu est sûr. Les fichiers ne sont pas analysés contre les logiciels malveillants ; définir une procédure de contrôle avant utilisation réelle. Les catégories sont contrat, attestation et autre : ne pas utiliser pour des données médicales sans validation spécifique. L'archivage masque le document mais ne supprime pas ses données ; la suppression définitive, les durées de conservation, la restauration, la rotation des clés et le traitement des sauvegardes restent à concevoir. Pas de notification automatique lors du partage.

Les tests portent sur les formats, la migration, l'isolation SQL par compte, l'archivage, la suppression du partage et l'audit avec PGlite. Ils ne remplacent pas des tests HTTP multi-comptes, de téléchargement direct, de révocation concurrente, de charge, de restauration et d'accès aux sauvegardes avec PostgreSQL réel. Vérifier aussi les téléchargements dans l'application Android.


### Solde initial et rapprochement manuel

Après `rh-remunerations.sql` et `rh-retraits.sql`, sauvegarder et exécuter une fois `docs/sql/rh-soldes-initiaux.sql` avec le propriétaire. Accorder au compte applicatif uniquement `SELECT, INSERT` sur `redaction_rh.opening_balances` et maintenir les droits d'insertion sur l'audit ; il ne doit pas pouvoir modifier ou supprimer les soldes initiaux. Cette migration est obligatoire pour le prototype de retraits : sans elle les routes échouent fermées.

Pour chaque collaborateur et chaque devise, un super-administrateur distinct du compte lié établit un solde initial non négatif et le mois de coupure inclus. Ce montant représente **ce qui reste dû à la fin de ce mois**, après rapprochement manuel de toutes les sommes et paiements antérieurs. Les rémunérations validées jusqu'à ce mois ne sont pas ajoutées ; seules les rémunérations validées des mois ultérieurs le sont. Vérifier également que ces rémunérations ultérieures n'ont pas déjà été payées hors du système. CDF et USD restent séparés, sans conversion.

L'initialisation est unique, définitive dans cette version et auditée avec l'acteur et l'identifiant du solde. Elle est refusée si un retrait existe déjà pour ce dossier et cette devise, même annulé, si le dossier n'a pas de compte lié, ou si l'admin correspond au compte lié. Une identité différente par e-mail ne garantit pas que deux comptes appartiennent à des personnes différentes : vérifier la séparation des fonctions. Les opérations de retrait et la création du solde verrouillent le même dossier ; seules les sommes disponibles après ouverture peuvent être demandées. Dès qu'une table de soldes initiaux existe, la création ou validation d'une rémunération à un mois inclus dans le solde initial est refusée, même lorsque les retraits sont désactivés. Les opérations enregistrées avant cette protection doivent être revérifiées avant réactivation.

Cette étape n'importe ni ne vérifie les paiements externes, ne modifie pas les montants validés et ne remplace pas un rapprochement comptable. Elle ne résout pas les retraits déjà enregistrés avant cette migration : un plan de migration et une revue manuelle sont nécessaires, sans modifier directement les données en production. La vérification des ajustements et corrections, les tests HTTP et les tests de concurrence réels sont encore nécessaires ; maintenir les retraits désactivés en production. Les tests PGlite vérifient la migration, l'unicité et le calcul séparé des soldes, mais pas l'ensemble des transactions PostgreSQL réelles.


### Ajustements financiers manuels — préproduction

Après `rh-soldes-initiaux.sql` et les migrations des retraits, sauvegarder puis exécuter une seule fois `docs/sql/rh-ajustements.sql` avec le propriétaire. Accorder au compte applicatif `SELECT, INSERT, UPDATE` sur `redaction_rh.balance_adjustments` et conserver `INSERT` sur le journal ; la migration est désormais indispensable aux calculs de retraits. Ces fonctions restent liées aux indicateurs de rémunération et retraits, désactivés par défaut.

Le gestionnaire financier ou l'admin peut proposer un crédit ou une diminution avec un montant positif, une devise et un motif obligatoire. Le solde initial de cette devise doit déjà être établi. Une décision explicite valide ou annule le brouillon. Les écritures validées sont immuables dans l'application et visibles avec leur motif par le collaborateur lié ; une correction ultérieure est une nouvelle écriture distincte. La création et la décision sont journalisées. Ne pas inclure de données sensibles dans le motif. Les brouillons ne sont pas visibles du collaborateur et n'affectent pas son solde.

Le solde ajoute les crédits et soustrait les diminutions validées. Le contrôle du montant disponible tient compte des réservations et des paiements ; une diminution qui rendrait le disponible négatif est refusée. La création de retraits, la validation des ajustements et les autres opérations financières verrouillent le dossier pour sérialiser les mises à jour. Les montants CDF et USD restent séparés. Un gestionnaire ne peut pas valider ou annuler un ajustement pour le compte actuellement lié à sa propre adresse ; une revue d'identité distincte reste nécessaire pour les personnes possédant plusieurs comptes.

Aucune journée sans prestation ne crée d'ajustement : les diminutions nécessitent une validation humaine et leur fondement doit être validé en RDC. Un workflow de contestation distinct et désactivé par défaut est disponible ; aucune notification push n'est envoyée et aucune correction n'est automatique. Les 500 dernières écritures sont affichées, mais toutes les écritures validées entrent dans le calcul. La création d'un brouillon n'est pas idempotente : après une erreur réseau, vérifier la liste avant de recommencer afin d'éviter un doublon.

Les tests couvrent les règles d'entrée, les calculs exacts, les contraintes SQL et la portée des lectures avec PGlite. Les rôles effectifs, tests HTTP multi-comptes, concurrence et récupération après erreur sur PostgreSQL réel, contrôle du rapprochement, revue légale et contrôles d'audit complets restent requis avant une utilisation réelle.


### Vérifications isolées complémentaires

Une compilation Next.js de production a réussi. Un test optionnel `tests/rh-postgres-integration.test.mjs` a été exécuté sur PostgreSQL 18.4 local : toutes les migrations, deux réservations concurrentes, deux diminutions concurrentes, interdiction d'auto-traitement, séparation de deux comptes, coupure malgré désactivation des retraits et rollback sur erreur d'audit. Le test utilise directement les fonctions applicatives, pas une simulation SQL de celles-ci. Le test HTTP `tests/rh-http-integration.test.mjs` a utilisé Next.js, cette base isolée et un Strapi **simulé**, avec deux comptes et un administrateur fictifs : refus anonyme, permissions financières, révocation puis réattribution, contrôle d'origine, réutilisation de clé, refus de dépassement, isolation et archivage d'un document partagé. Ces tests ne garantissent pas la sécurité complète, ni le comportement de votre Strapi, votre proxy, vos rôles PostgreSQL ou votre infrastructure.

Pour reproduire : installer séparément un PostgreSQL de test, créer une base **locale vide** `rh_integration_test`, puis exécuter `RH_TEST_POSTGRES_URL=postgres://.../rh_integration_test node --conditions=react-server --import tsx --test tests/rh-postgres-integration.test.mjs`. Le test refuse les hôtes non locaux et les bases d'un autre nom, et s'arrête si le schéma RH existe déjà ; il crée des données fictives et des migrations et ne doit jamais viser une base métier. Pour le test HTTP, démarrer `node tests/fixtures/rh-fake-strapi.cjs` et Next.js de test sur une interface locale uniquement, avec `STRAPI_URL=http://127.0.0.1:58090`, `STRAPI_API_TOKEN=fake-server-token`, la même base dédiée, les drapeaux RH de finance, retraits, rôles, documents, contestations et notifications de gestion à `true`, et `REDACTION_RH_ALLOWED_ORIGINS` réglé sur l'origine locale Next. Exécuter ensuite `RH_TEST_HTTP_URL=http://127.0.0.1:53001 node --test tests/rh-http-integration.test.mjs`. Ces fixtures ont des identifiants volontairement fictifs et non sécurisés : ne jamais les exposer ni les utiliser en production.

Restent à valider notamment les droits du compte PostgreSQL non propriétaire, migrations et reprise sur une copie représentative, concurrence et révocation en cours de requête, éventuels doublons de paiement après incident ou nouvelle saisie, tests Strapi réel et navigateur, antivirus et conservation documentaire, séparation réelle des personnes et validation juridique en RDC. Maintenir les drapeaux financiers et documentaires désactivés en production en attendant ces contrôles.


## RH 1.0.2 — contestations et points encore ouverts

La revue a identifié notamment : absence de suivi des contestations, risque de doublons après erreur ou rechargement lors de certaines saisies financières, limites de l'historique d'audit, absence de politique de conservation et de suppression documentaire, permissions non testées sur l'installation réelle, et rapprochement des paiements externes encore manuel. La présente étape traite le premier point ; les autres restent à planifier et ne sont pas considérés comme résolus. « 1.0.2 » désigne cette étape du module RH, pas une validation de production ni une nouvelle version de l'application entière.

### Mise en place des contestations privées

Après `rh-initial.sql` et `rh-account-links.sql`, sauvegarder puis appliquer une seule fois `docs/sql/rh-contestations.sql` dans la base RH privée avec le propriétaire. Accorder au rôle applicatif `SELECT, INSERT, UPDATE` sur `redaction_rh.disputes` et conserver `INSERT` sur le journal d'audit (et les permissions existantes de liaison et collaborateurs). Ne pas accorder ces droits à Strapi. La fonctionnalité est désactivée par défaut : `REDACTION_RH_DISPUTES_ENABLED=true` active les routes et les vues après migration et tests isolés. Aucun changement n'a été appliqué sur une base réelle.

Un collaborateur lié et actif peut envoyer une contestation sur une rémunération ou un solde, une prestation ou un autre sujet, puis l'annuler tant qu'elle est en attente. Un super-admin distinct de l'auteur et du compte actuellement lié peut répondre une seule fois ; la réponse est définitive dans l'application. Une contestation ne gèle ni ne modifie le solde, la rémunération, le relevé ou les retraits. L'administrateur doit traiter toute éventuelle correction séparément et vérifier son fondement légal en RDC. Une alerte interne distincte peut signaler les nouvelles contestations au super-admin ; aucune notification de réponse n'est envoyée au collaborateur, qui doit actualiser. Prévoir un suivi opérationnel. Une liste des 100 plus anciennes contestations ouvertes des dossiers actifs est accessible au super-admin.

La contestation et sa réponse restent conservées dans la base et visibles des super-admins après déliaison ; seul le compte d'origine, lorsqu'il est à nouveau lié au même dossier actif, peut en voir le contenu. Un compte nouvellement lié ne peut ni lire ni annuler les demandes de l'ancien compte, et l'administrateur ne peut pas y répondre tant que le compte d'origine n'est pas lié. L'archivage bloque l'accès personnel et les décisions. Création, annulation et réponse sont auditées dans la même transaction ; le message et la réponse figurent sur la contestation, pas dans l'événement d'audit. La liste affiche les 500 plus récentes ; il n'y a pas de pagination, de suppression, de discussion à plusieurs réponses ou de notification. Ne pas saisir de données médicales ou autres données sensibles ; définir une durée de conservation et des règles d'accès avant toute utilisation réelle.

Une clé permet de répéter sans doublon une création identique tant que le formulaire reste ouvert ; la clé change si le message ou le sujet est modifié et ne survit pas au rechargement. Après une erreur réseau ou un rechargement, consulter la liste avant de réessayer. La limitation de débit et un suivi complet des tentatives restent à concevoir.

Tests effectués : validation et contraintes avec PGlite, transactions PostgreSQL 18 isolé (double envoi, séparation de comptes, déliaison et reliaison, réponse et annulation), et parcours HTTP avec Strapi simulé. Le comportement de Strapi et des permissions réels, la sécurité, les performances et les règles de conservation restent à valider en préproduction avant activation.

### Notifications internes destinées à la gestion

Les super-admins et gestionnaires autorisés peuvent recevoir dans la Rédaction une cloche RH distincte pour les nouvelles déclarations de prestation, demandes d'absence et demandes de retrait, ainsi que les contestations. Les gestionnaires RH voient uniquement prestations et absences ; les financiers, uniquement les retraits lorsque ceux-ci sont activés ; les contestations sont réservées aux super-admins et masquées si leur fonction est désactivée. Les super-admins voient les catégories disponibles. Les permissions sont revérifiées côté serveur à chaque lecture et marquage, pas seulement dans l'interface.

Après `rh-initial.sql`, sauvegarder puis exécuter une seule fois `docs/sql/rh-notifications-gestion.sql` dans la base RH privée. Donner au rôle applicatif `SELECT, INSERT` sur `redaction_rh.management_events` et `SELECT, INSERT, UPDATE` sur `redaction_rh.management_event_reads` ; ne pas accorder l'accès à Strapi. Le paramètre serveur `REDACTION_RH_MANAGEMENT_NOTIFICATIONS_ENABLED=true`, **désactivé par défaut**, active la création des alertes et la cloche. L'ancien paramètre `REDACTION_RH_NOTIFICATIONS_ENABLED` reste indépendant et concerne les notifications personnelles des collaborateurs. Si la migration ou les droits de la nouvelle fonction manquent alors que son indicateur est actif, la création des demandes concernées échoue : l'événement et la demande sont enregistrés dans la même transaction. Aucune migration n'a été exécutée sur votre base réelle.

Les alertes sont génériques, sans nom, montant, motif ou description ; suivre le lien ouvre la section RH concernée. Les 30 alertes les plus récentes accessibles sont affichées et le badge compte uniquement celles non lues dans cette liste. Chaque compte marque ses alertes comme lues indépendamment. Le contrôle utilise l'identifiant et l'e-mail du compte Rédaction ; vérifier l'unicité des identités et l'authentification réelle avant activation. L'actualisation a lieu toutes les 30 secondes lorsque l'application est ouverte et visible. Ce n'est ni une notification push, ni un e-mail, ni une alerte garantie écran verrouillé ; la cloche n'apparaît pas dans l'éditeur plein écran. La notification signale une création passée et peut subsister si la demande est ensuite annulée ou traitée ; vérifier son état dans la section concernée.

Les événements survenus avant activation ne sont pas repris automatiquement. Un rôle nouvellement accordé peut voir les événements historiques de ses catégories ; une révocation empêche les accès suivants mais pas nécessairement une requête déjà en cours. Les événements et les lectures restent enregistrés jusqu'à définition d'une politique de conservation ; il n'y a pas de purge automatique. Tester la configuration, les permissions et l'isolation en préproduction avant tout usage réel.
