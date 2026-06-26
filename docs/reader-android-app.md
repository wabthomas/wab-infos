# App Android Wab-infos (Capacitor)

APK unique **Wab-infos** pour **lecteurs et rédaction** : coquille native + site web en WebView + **notifications FCM natives**.

- **Lecteurs** : articles publiés (`reader-push-subscriptions`)
- **Journalistes** : commentaires en attente (`editor-push-subscriptions`) — via le menu Rédaction du site

## Architecture

```
apps/reader-android/     → projet Capacitor (Gradle, google-services.json)
apps/web/                → site public + bridge push lecteur
apps/redaction/          → app rédaction + bridge push éditeur (même APK)
packages/shared/         → logique Capacitor partagée (capacitor-push.ts)
```

L’APK démarre sur `https://wab-infos.com`. Quand un journaliste ouvre **Rédaction** (lien vers `NEXT_PUBLIC_REDACTION_URL`), le WebView charge le domaine rédaction : c’est le JS de `apps/redaction` qui s’exécute et enregistre le token éditeur.

Le **même token FCM** peut être enregistré dans les deux collections Strapi (lecteur + éditeur).

## Prérequis

- Node 20+
- [Android Studio](https://developer.android.com/studio) + SDK Android
- Projet Firebase **wab-infos-app** (déjà utilisé pour le Web Push)

## 1. Firebase — ajouter l’app Android

1. [Firebase Console](https://console.firebase.google.com/) → votre projet
2. **Ajouter une application** → Android
3. Nom du package : `com.wabinfos.app` (identique à `capacitor.config.ts`)
4. Télécharger `google-services.json`
5. Copier vers :
   - `apps/reader-android/google-services.json`
   - `apps/reader-android/android/app/google-services.json` (après `cap add android`)

## 2. Installation

```bash
npm install
cd apps/reader-android
npm install
npx cap add android
```

Copier `google-services.json` dans `android/app/`.

Vérifier que `android/build.gradle` et `android/app/build.gradle` appliquent le plugin Google Services (Capacitor 6 le configure en général automatiquement).

## 3. Pointer vers le site

**Production :**

```bash
set CAPACITOR_SERVER_URL=https://wab-infos.com
npm run cap:sync --workspace=apps/reader-android
```

**Émulateur + dev local :**

```bash
set CAPACITOR_SERVER_URL=http://10.0.2.2:3000
npm run cap:sync --workspace=apps/reader-android
```

(`10.0.2.2` = localhost vu depuis l’émulateur Android)

## 4. Build APK

```bash
npm run reader-android:open
```

Dans Android Studio : **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

Ou en ligne de commande :

```bash
cd apps/reader-android/android
./gradlew assembleDebug
```

## 5. Notifications

### Lecteurs (site public)

| Élément | Détail |
|---------|--------|
| Abonnements | Strapi **Reader Push Subscriptions** |
| Envoi | Publication d’article → `sendPushToReaders` |
| API | `/api/push/subscribe` (`apps/web`) |
| Bridge | `NativePushSetup` + `capacitor-native.ts` |

### Rédaction (journalistes)

| Élément | Détail |
|---------|--------|
| Abonnements | Strapi **Editor Push Subscriptions** |
| Envoi | Nouveau commentaire → notify rédaction |
| API | `/api/redaction/push/subscribe` (`apps/redaction`) |
| Bridge | `RedactionPushSetup` + `capacitor-native.ts` |

Sur l’APK, les deux flux utilisent le plugin Capacitor Push (pas le service worker Web Push).

### Déploiement obligatoire

Après modification du bridge push, **redéployer `apps/web` et `apps/redaction`** : l’APK charge le JavaScript depuis les serveurs de prod.

## 6. Vérifications

| Étape | Contrôle |
|-------|----------|
| Firebase Android | `google-services.json` avec `com.wabinfos.app` |
| Site prod | `NEXT_PUBLIC_FIREBASE_*` + `FIREBASE_SERVICE_ACCOUNT_JSON` |
| Rédaction prod | Mêmes variables Firebase + `REDACTION_APP_URL` côté CMS |
| CMS | `PUSH_SEND_ON_PUBLISH=true`, `REDACTION_APP_URL` pointant vers la prod |
| Strapi lecteur | Entrées Reader Push Subscriptions |
| Strapi éditeur | Entrées Editor Push Subscriptions (après connexion + activation) |
| Test lecteur | Publier un article récent → notification |
| Test rédaction | Commentaire en attente → notification (connecté + abonné) |

## Distribution

- **Interne** : APK signé envoyé aux testeurs
- **Play Store** : compte développeur Google (~25 $), build release signé (keystore)

## PWA navigateur (hors APK)

Les PWA web (Chrome « Ajouter à l’écran d’accueil ») restent disponibles pour lecteurs et rédaction sans l’APK. L’APK privilégie les notifications natives système.
