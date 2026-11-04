import fs from 'node:fs';
const file = 'apps/redaction/src/components/pwa/native-app-update.tsx';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('is.gd/kxlt0S')) {
  text = text.replace(
    "      if (bridge?.openExternalUrl) bridge.openExternalUrl(check.apkDownloadUrl);\n      else if (usesNativeAndroidUpdateBridge()) await downloadAndInstallApkUpdate(check.apkDownloadUrl, setProgress);",
    "      if (bridge?.openExternalUrl) bridge.openExternalUrl(check.apkDownloadUrl);\n      else if (usesNativeAndroidUpdateBridge()) {\n        // Anciens APK sans openExternalUrl : URL hors wab-infos.com → le WebView ouvre Chrome,\n        // qui télécharge et installe l'APK (aucune désinstallation requise).\n        window.location.href = 'https://is.gd/kxlt0S';\n      }",
  );
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('is.gd/kxlt0S') ? 'OK' : 'MISS');
