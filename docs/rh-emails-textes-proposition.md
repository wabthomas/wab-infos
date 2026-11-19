# Refonte des textes e-mail RH — proposition à valider

> **Décision retenue (19/11/2026)** : option **A — Professionnel et direct**, boutons contextualisés par rôle, salutation avec le prénom du destinataire, préfixe de sujet **`[WAB RH]`**. Ces choix sont appliqués dans le code et déployés.

> Les textes ci-dessous ont servi de base à l’application ; ils restent la référence éditoriale.

## 1. Problèmes constatés

| Problème | Exemple actuel | Conséquence |
|---|---|---|
| Titre = sujet = phrase nominale | « Contrat signé à approuver » | impresssion de message automatique inachevé, destinataire non identifié |
| Salutation impersonnelle | « Bonjour, » | aucun lien avec la personne, ton administratif |
| Corps qui répète le titre | « Un collaborateur a signé son contrat… » | le texte n’explique pas **qui doit faire quoi** |
| Bouton identique pour tous | « Ouvrir Mon espace RH » | un gestionnaire n’est pas dans « mon espace RH » |
| Aucune hiérarchie d’action | notification informative et action requise traitées pareil | le destinataire ne sait pas s’il doit agir |
| Pas de contexte | pas de nom, date, référence | difficile de retrouver le dossier |

## 2. Structure de template proposée

Tous les e-mails RH utilisent la même ossature :

```
Sujet      : [RH] <action attendue> — <nom / objet>
Pré-en-tête: résumé d’une ligne
Badge      : NOTIFICATION  ou  ACTION REQUISE
Salutation : Bonjour <Prénom>,
Titre      : <résultat ou action>
Paragraphe : 1 phrase de contexte + 1 phrase d’action
Bouton     : <verbe concret>, adapté au destinataire
Lien de secours
Pied       : entreprise · e-mail automatique · support
```

Règles :

- **sujet distinct du titre** : le sujet sert à trier la boîte mail, le titre à comprendre ;
- **une seule action par e-mail**, formulée au bon destinataire ;
- bouton **« Ouvrir Mon espace RH »** réservé aux collaborateurs ;
- boutons gestionnaires : **« Traiter la demande »**, **« Valider la prestation »**, **« Ouvrir les contrats à valider »**… ;
- prénom utilisé si disponible, sinon « Bonjour, » ;
- aucune donnée financière, aucun motif médical dans le corps.

## 3. Option A — Professionnel et direct (recommandée)

Ton neutre, précis, action en premier. C’est la version proposée par défaut.

### 3.1 Côté collaborateur

| Événement | Sujet | Titre | Corps | Bouton |
|---|---|---|---|---|
| Contrat à signer | `[RH] Votre contrat est prêt à signer` | Votre contrat est prêt à être signé | Bonjour {{Prénom}}, votre contrat a été préparé par le service RH. Relisez-le puis signez-le en ligne. | Lire et signer mon contrat |
| Signature enregistrée | `[RH] Signature enregistrée — contrat en attente de validation` | Votre signature a bien été enregistrée | Le contrat est maintenant en attente de validation par le service RH. Vous serez notifié dès qu’il sera validé. | Suivre mon contrat |
| Contrat approuvé | `[RH] Votre contrat est validé` | Votre contrat est validé | Bonjour {{Prénom}}, votre contrat a été validé par le service RH. Vous pouvez le consulter à tout moment. | Consulter mon contrat |
| CDD bientôt échu | `[RH] Votre CDD arrive à échéance` | Votre contrat CDD arrive à échéance | Votre contrat CDD arrive à son terme le {{date}}. Le service RH vous contactera si un renouvellement est prévu. | Voir mon contrat |
| Congé approuvé | `[RH] Votre demande de congé est approuvée` | Votre demande de congé est approuvée | Bonjour {{Prénom}}, votre demande du {{dates}} a été approuvée. Le détail est disponible dans votre espace RH. | Voir mon congé |
| Congé refusé | `[RH] Votre demande de congé n’a pas été approuvée` | Votre demande de congé n’a pas été approuvée | La demande du {{dates}} n’a pas été retenue. Le motif est disponible dans votre espace RH. | Consulter la décision |
| Prestation enregistrée | `[RH] Votre déclaration de prestation est enregistrée` | Votre déclaration a bien été enregistrée | Votre déclaration a été transmise au service RH. Elle est en attente de validation. | Suivre ma déclaration |
| Prestation validée | `[RH] Votre prestation est validée` | Votre prestation est validée | Votre déclaration a été validée par le service RH. Vous pouvez la consulter dans votre espace. | Voir ma prestation |
| Prestation refusée | `[RH] Votre déclaration de prestation n’a pas été validée` | Votre déclaration n’a pas été validée | Votre déclaration n’a pas été retenue. Le motif est disponible dans votre espace RH. | Consulter la décision |
| Rémunération disponible | `[RH] Votre rémunération est disponible` | Votre rémunération est disponible | Votre rémunération a été validée. Consultez le détail dans votre espace RH. | Voir ma rémunération |
| Retrait traité | `[RH] Votre retrait a été traité` | Votre retrait a été traité | Le traitement de votre demande est terminé. Consultez le détail dans votre espace RH. | Voir mon retrait |
| Carte de service | `[RH] Votre carte de service est disponible` | Votre carte de service est disponible | Votre carte professionnelle a été émise. Vous pouvez la consulter et la télécharger. | Voir ma carte |
| Correction de pointage traitée | `[RH] Votre correction de pointage a été traitée` | Votre correction de pointage a été traitée | Votre demande de correction a reçu une décision. Consultez le détail dans votre espace RH. | Voir mon pointage |
| Correction enregistrée | `[RH] Votre correction de pointage est enregistrée` | Votre demande de correction est enregistrée | Votre demande a bien été transmise au service RH. Elle attend une validation. | Suivre ma demande |
| Contestation enregistrée | `[RH] Votre contestation a été enregistrée` | Votre contestation a été enregistrée | Nous avons bien reçu votre contestation. Elle sera examinée par le service RH. | Suivre ma contestation |
| Réponse à une contestation | `[RH] Votre contestation a reçu une réponse` | Votre contestation a reçu une réponse | Le service RH a répondu à votre contestation. Consultez la réponse dans votre espace. | Lire la réponse |
| Document disponible | `[RH] Un nouveau document est disponible` | Un nouveau document est disponible | Un document a été ajouté à votre espace Documents RH. Consultez-le dès que possible. | Ouvrir mes documents |
| Paiement historique | `[RH] Votre paiement historique est disponible` | Votre paiement historique est disponible | Le paiement historique a été enregistré. Consultez le détail dans votre espace RH. | Voir le paiement |
| Rappel sortie | `[RH] Pensez à signer votre sortie` | Votre sortie n’est pas encore signée | Bonjour {{Prénom}}, votre pointage du {{date}} ne comporte pas de signature de sortie. Si votre journée est terminée, vous pouvez la signer maintenant. | Signer ma sortie |
| Rappel prestation | `[RH] Pensez à déclarer votre prestation` | Votre prestation n’est pas encore déclarée | Aucune déclaration n’a été enregistrée pour aujourd’hui. Si vous avez travaillé, vous pouvez la déclarer depuis votre espace RH. | Déclarer ma prestation |

### 3.2 Côté gestionnaire RH

| Événement | Sujet | Titre | Corps | Bouton |
|---|---|---|---|---|
| Contrat signé par le collaborateur | `[RH] Contrat à valider — {{Nom}}` | Un contrat attend votre validation | {{Nom}} a signé son contrat. Votre approbation est nécessaire pour le finaliser. | Ouvrir les contrats à valider |
| CDD bientôt échu | `[RH] Échéance CDD proche — {{Nom}}` | Un contrat CDD arrive à échéance | Le contrat CDD de {{Nom}} arrive à échéance le {{date}}. Vérifiez s’il doit être renouvelé ou clôturé. | Ouvrir les contrats |
| Nouvelle prestation | `[RH] Prestation à valider — {{Nom}}` | Une prestation attend votre validation | {{Nom}} a déclaré une journée de prestation. Vérifiez les informations avant de valider ou de refuser. | Valider la prestation |
| Nouvelle absence | `[RH] Demande de congé à traiter — {{Nom}}` | Une demande de congé attend votre décision | {{Nom}} a déposé une demande d’absence. Consultez les dates avant de statuer. | Traiter la demande |
| Nouveau retrait | `[RH] Retrait à traiter — {{Nom}}` | Une demande de retrait attend votre traitement | {{Nom}} a demandé un retrait. Le détail est disponible dans l’espace RH sécurisé. | Ouvrir les retraits |
| Nouvelle contestation | `[RH] Contestation à examiner — {{Nom}}` | Une contestation a été déposée | {{Nom}} a signalé un désaccord. Consultez le dossier pour y répondre. | Ouvrir la contestation |
| Nouveau document | `[RH] Document à consulter — {{Nom}}` | Un collaborateur a déposé un document | {{Nom}} a ajouté un document dans son espace RH. Consultez-le pour vérifier s’il nécessite un traitement. | Ouvrir les documents |

### 3.3 Annonces, rappels et test

| E-mail | Sujet | Titre | Corps | Bouton |
|---|---|---|---|---|
| Annonce publiée | `[RH] Information importante — {{titre annonce}}` | {{titre annonce}} | {{texte saisi par l’admin}} | Lire l’annonce |
| Test SMTP | `[RH] Test de configuration SMTP` | Configuration SMTP validée | Cet e-mail confirme que le serveur SMTP des notifications RH est correctement configuré et que le modèle est bien appliqué. | Ouvrir les paramètres RH |

## 4. Option B — Chaleureux et humain

Même structure, ton plus proche. Exemples pour les messages les plus sensibles :

| Événement | Sujet | Titre | Corps | Bouton |
|---|---|---|---|---|
| Contrat à signer | `[RH] Bonne nouvelle : votre contrat est prêt` | Votre contrat vous attend | Bonjour {{Prénom}}, votre contrat a été préparé avec soin par le service RH. Prenez le temps de le relire, puis signez-le en ligne quand vous êtes prêt. | Relire et signer mon contrat |
| Contrat validé | `[RH] Votre contrat est validé 🎉` | Tout est en ordre : votre contrat est validé | Bonjour {{Prénom}}, votre contrat a été validé par le service RH. Vous pouvez le retrouver à tout moment dans votre espace. | Consulter mon contrat |
| Congé refusé | `[RH] Votre demande de congé n’a pas été retenue` | Votre demande de congé n’a pas été retenue | Bonjour {{Prénom}}, votre demande du {{dates}} n’a pas pu être acceptée. Le motif est disponible dans votre espace RH ; n’hésitez pas à échanger avec le service RH. | Consulter la décision |
| Prestation refusée | `[RH] Votre déclaration n’a pas été validée` | Votre déclaration n’a pas été validée | Bonjour {{Prénom}}, votre déclaration n’a pas été retenue. Le motif est disponible dans votre espace ; le service RH reste disponible pour en discuter. | Consulter la décision |
| Rappel sortie | `[RH] Il reste une petite étape pour aujourd’hui` | Votre sortie n’est pas encore signée | Bonjour {{Prénom}}, votre journée est peut-être terminée : il ne manque plus que la signature de sortie de votre pointage. | Signer ma sortie |

## 5. Option C — Institutionnel et concis

Pour les e-mails adressés à la direction ou aux gestionnaires, version courte sans phrase de politesse développée :

```
Sujet : [RH] Contrat à valider — {{Nom}}
Titre : Contrat en attente de validation
Corps : {{Nom}} a signé son contrat. Une validation est requise.
Bouton : Ouvrir les contrats à valider
```

## 6. Choix à faire

1. **Ton** : A (professionnel direct, recommandé), B (chaleureux) ou C (institutionnel concis) ?
2. **Salutation** : « Bonjour {{Prénom}}, » ou « Bonjour, » ?
3. **Préfixe de sujet** : `[RH]`, `[WAB RH]` ou aucun ?
4. **Boutons** : libellés contextualisés par rôle (recommandé) ou conserver un bouton unique ?
5. **Informations contextuelles** : ajouter le nom du collaborateur et la date dans le corps, ou rester générique ?
6. **Annonces** : conserver le texte libre de l’admin ou imposer un titre + texte ?

Après ton choix, j’applique les textes retenus dans `notifications.ts`, `contract-alerts.ts`, les rappels, le test SMTP et le template e-mail (avec bouton et salutation dynamiques), puis je vérifie par des tests et un envoi de contrôle.
