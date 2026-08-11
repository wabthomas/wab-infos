# App Android Wab-infos (WebView native)

APK **Wab-infos** : WebView native + écran de lancement Android + notifications FCM par topics.

## Architecture

```
apps/reader-android/android/   → projet Gradle (WebView, FCM, launcher natif)
apps/web/                      → site chargé dans la WebView (https://wab-infos.com)
```

L’APK charge `https://wab-infos.com`. Les sous-domaines `*.wab-infos.com` (rédaction, CMS) restent dans la WebView.

**User-agent** : suffixe `WabInfosNative/x.x.x` — le site masque le splash PWA et le bandeau d’installation dans l’APK.

## Fonctionnalités natives

- Écran de lancement animé (logo + tagline)
- Pull-to-refresh, mode hors-ligne, barre de progression
- Partage natif (`navigator.share` → Android)
- Sync barre de statut avec thème clair/sombre du site
- Upload fichiers / photo depuis la WebView
- Mise à jour : **Google Play In-App Updates** si l’app est installée depuis le Play Store ; sinon téléchargement APK via `downloads/apk-version.json` (bandeau web + dialogue natif).
- FCM topics `all_users` et `news` (flavor `withFcm`)

## Prérequis

- Node 20+
- JDK 17+
- Android SDK (compileSdk / targetSdk 36)
- `android/keystore.properties` + keystore release
- `android/app/google-services.json` (Firebase, package `com.wabinfos.app`)

## Build APK release

```bash
npm run reader-android:release
```

APK généré : `apps/reader-android/android/app/build/outputs/apk/withFcm/release/app-withFcm-release.apk`

Copie automatique vers `apps/web/public/downloads/wab-infos.apk` + `apk-version.json`.

Sans `google-services.json` : build `noFcm` (pas de push FCM).

## Installer sur téléphone (USB)

```bash
npm run reader-android:install
```

## Google Play (AAB)

```bash
npm run reader-android:bundle
```

## Icônes

```bash
npm run reader-android:icons
```

Source : `apps/reader-android/assets/app-icon.png`

## Deep links (App Links)

Les liens `https://wab-infos.com/...` (et `www`) s’ouvrent dans l’APK si :

1. L’APK est installé (intent-filter `autoVerify` dans le manifest).
2. Le fichier Digital Asset Links est servi **sans redirection** sur les deux hôtes :
   `https://wab-infos.com/.well-known/assetlinks.json`
   `https://www.wab-infos.com/.well-known/assetlinks.json`
3. Les empreintes SHA-256 du JSON incluent :
   - la clé **upload / keystore release** (déjà dans le code)
   - la clé **Play App Signing** (Play Console → Intégrité de l’app → SHA-256), via :
   ```
   ANDROID_APP_PACKAGE_NAME=com.wabinfos.app
   ANDROID_APP_LINK_SHA256=AA:BB:CC:...
   ```

   ```bash
   keytool -list -v -keystore <votre.keystore> -alias <alias>
   ```

Vérification Android : Paramètres → Apps → Wab-infos → Ouvrir par défaut → liens vérifiés.

Schéma de secours : `wabinfos://article/<category>/<slug>`

## Ouvrir dans Android Studio

Ouvrir le dossier `apps/reader-android/android`.
