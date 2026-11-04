import fs from 'node:fs';

// Pont partagé : ouvrir une URL dans le navigateur externe.
let bridge = fs.readFileSync('packages/shared/src/android-webview-bridge.ts', 'utf8');
if (!bridge.includes('openExternalUrl')) {
  bridge = bridge.replace(
    "  share?: (title: string, text: string, url: string) => void;",
    "  share?: (title: string, text: string, url: string) => void;\n  /** Ouvre une URL dans le navigateur externe (Chrome) au lieu de la WebView. */\n  openExternalUrl?: (url: string) => void;",
  );
}
fs.writeFileSync('packages/shared/src/android-webview-bridge.ts', bridge, 'utf8');
console.log('BRIDGE_TYPE', bridge.includes('openExternalUrl') ? 'OK' : 'MISS');

// Bandeau : « Mettre à jour » ouvre le navigateur pour télécharger/installer l'APK.
let upd = fs.readFileSync('apps/redaction/src/components/pwa/native-app-update.tsx', 'utf8');
const oldBody = upd.match(/  async function update\(\) \{[\s\S]*?\n  \}/);
if (oldBody) {
  upd = upd.replace(
    oldBody[0],
    `  async function update() {
    if (!check?.remote || !check.apkDownloadUrl) return;
    writeLocal(INSTALL_STARTED_KEY, apkBannerStamp(check.remote.versionCode));
    setError('');
    const bridge = getAndroidWebViewBridge();
    try {
      // Téléchargement + installation par le navigateur (Chrome), comme une mise à jour standard.
      if (bridge?.openExternalUrl) bridge.openExternalUrl(check.apkDownloadUrl);
      else if (usesNativeAndroidUpdateBridge()) await downloadAndInstallApkUpdate(check.apkDownloadUrl, setProgress);
      else window.open(check.apkDownloadUrl, '_blank', 'noopener,noreferrer');
      setState('idle');
    } catch (cause) {
      writeLocal(INSTALL_STARTED_KEY, null);
      setError(cause instanceof Error ? cause.message : 'Ouverture du navigateur impossible. Réessayez.');
      setState('error');
    }
  }`,
  );
}
fs.writeFileSync('apps/redaction/src/components/pwa/native-app-update.tsx', upd, 'utf8');
console.log('UPDATE_COMPONENT', upd.includes('openExternalUrl') ? 'OK' : 'MISS');

// Java : méthode native d'ouverture du navigateur.
let java = fs.readFileSync('apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java', 'utf8');
if (!java.includes('public void openExternalUrl')) {
  java = java.replace(
    "        @android.webkit.JavascriptInterface\n        public void printPage() {",
    `        @android.webkit.JavascriptInterface
        public void openExternalUrl(String url) {
            if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) return;
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception error) {
                    Log.w("WabInfos", "Ouverture navigateur impossible", error);
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void printPage() {`,
  );
}
fs.writeFileSync('apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java', java, 'utf8');
console.log('JAVA_OPEN', java.includes('public void openExternalUrl') ? 'OK' : 'MISS');
