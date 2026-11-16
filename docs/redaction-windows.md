# Installer Wab-Redaction sur Windows

Wab-Redaction peut être installé comme une vraie application Windows **`.exe` (installateur NSIS) ou `.msi`**, en plus de l’installation PWA par navigateur. L’application Electron est un conteneur de bureau sécurisé qui ouvre l’application web officielle ; le serveur, le compte et la connexion Internet restent nécessaires. Elle n’embarque ni les données, ni le CMS, ni les secrets serveur.

## Obtenir les installateurs

Le workflow GitHub **Build Wab-Redaction Windows installers** produit les deux installateurs :

- lancement manuel via **Actions → Build Wab-Redaction Windows installers → Run workflow** ;
- ou création d’un tag `redaction-desktop-vX.Y.Z`.

Télécharger l’artefact **Wab-Redaction-Windows** de l’exécution réussie. L’artefact contient `Wab-Redaction-1.0.0-x64.exe` et `Wab-Redaction-1.0.0-x64.msi` (la version du nom suit `apps/redaction-desktop/package.json`). Les artefacts du lancement manuel sont conservés 30 jours. Pour générer les fichiers sur un poste Windows avec Node.js 22 :

```powershell
npm ci
npm run dist:win --workspace=apps/redaction-desktop
```

L’URL par défaut est `https://app.wab-infos.com/login`. Pour un test en développement seulement, l’application accepte `WAB_REDACTION_URL=http://localhost:3001/login`.

## Installation

Ouvrir le `.exe` ou `.msi` téléchargé et suivre l’assistant. L’installation est par utilisateur, sans privilèges administrateur par défaut. Le `.exe` et le `.msi` de CI ne sont pas signés Authenticode : Windows SmartScreen peut afficher un avertissement. Avant une diffusion publique, signer les installateurs avec un certificat d’éditeur vérifié.

Les ouvertures de session Google restent dans la fenêtre sécurisée de l’application ; les autres liens web s’ouvrent dans le navigateur par défaut. La connexion aux services Wab-infos est requise pour l’utilisation et les mises à jour du site sont immédiatement disponibles, sans réinstaller le conteneur.

## Installation PWA sans fichier téléchargé

L’installation par Edge ou Chrome reste disponible depuis la page de connexion :

1. Dans Edge : **⋯ → Applications → Installer ce site en tant qu’application**.
2. Dans Chrome : icône d’installation dans la barre d’adresse, ou **⋮ → Diffuser, enregistrer et partager → Installer la page en tant qu’application**.

Si l’option n’apparaît pas, vérifier HTTPS, le manifeste `/manifest.webmanifest` et le service worker de la rédaction, puis recharger la page. La PWA et le conteneur Electron requièrent tous deux le serveur Wab-Redaction ; ils ne fonctionnent pas hors ligne pour l’ensemble du contenu dynamique.

## Signature Authenticode

Sans certificat de signature de code, Windows affiche « Éditeur inconnu ». Pour signer les installateurs avec un certificat OV/EV reconnu, fournir le fichier PFX et son mot de passe au build :

```powershell
$env:CSC_LINK = 'C:\chemin\certificat-code-signing.pfx'
$env:CSC_KEY_PASSWORD = 'mot-de-passe-du-pfx'
npm run build:redaction:windows
```

Electron-builder signe alors l’exécutable, le MSI, l’installateur NSIS et le désinstalleur. Vérifier avec :

```powershell
Get-AuthenticodeSignature .\apps\redaction-desktop\release\Wab-Redaction-1.0.0-x64.exe
```

Un certificat auto-signé produit une signature techniquement valide mais **non reconnue** : SmartScreen continue d’afficher un avertissement. Une signature reconnue nécessite un certificat délivré par une autorité de certification.
