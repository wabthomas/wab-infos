import fs from 'node:fs';

// 1) Un seul bandeau dans l'APK : masquer le bandeau PWA quand le pont Android est présent.
let pwa = fs.readFileSync('apps/redaction/src/components/pwa/pwa-install-banner.tsx', 'utf8');
pwa = pwa.replace(
  "import { isAndroidDevice, isNativeCapacitorApp, isNativeCapacitorFromUserAgent } from '@wab-infos/shared';",
  "import { getAndroidWebViewBridge, isAndroidDevice, isNativeCapacitorApp, isNativeCapacitorFromUserAgent } from '@wab-infos/shared';",
);
pwa = pwa.replace(
  "if (isStandalonePwa() || isNativeCapacitorFromUserAgent()) {",
  "if (isStandalonePwa() || isNativeCapacitorFromUserAgent() || Boolean(getAndroidWebViewBridge())) {",
);
fs.writeFileSync('apps/redaction/src/components/pwa/pwa-install-banner.tsx', pwa, 'utf8');
console.log('PWA_BANNER', pwa.includes('getAndroidWebViewBridge()') ? 'OK' : 'MISS');

// 2) Bandeau de mise à jour : état installation + progression native.
let upd = fs.readFileSync('apps/redaction/src/components/pwa/native-app-update.tsx', 'utf8');
upd = upd.replace("type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'error';", "type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'error';");
upd = upd.replace(
  "  useEffect(() => {\n    void runCheck();",
  `  useEffect(() => {
    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ percent?: number }>).detail;
      if (typeof detail?.percent === 'number') setProgress(Math.max(0, Math.min(100, Math.round(detail.percent))));
    };
    const onInstalling = () => { setProgress(100); setState('installing'); };
    window.addEventListener('wab-apk-download-progress', onProgress);
    window.addEventListener('wab-apk-installing', onInstalling);
    return () => {
      window.removeEventListener('wab-apk-download-progress', onProgress);
      window.removeEventListener('wab-apk-installing', onInstalling);
    };
  }, []);
  useEffect(() => {
    void runCheck();`,
);
upd = upd.replace(
  "      // Le pont Android ouvre l'installateur ; aucune installation n'est présumée réussie ici.\n      setState('idle');",
  "      // Le pont Android ouvre l'installateur ; le passage à « installing » vient de l'événement natif.\n      if (!usesNativeAndroidUpdateBridge()) setState('idle');",
);
upd = upd.replace(
  "{state !== 'downloading' && <div className=\"flex shrink-0 items-center gap-2\">",
  "{state !== 'downloading' && state !== 'installing' && <div className=\"flex shrink-0 items-center gap-2\">",
);
upd = upd.replace(
  "{state === 'downloading' && <div className=\"px-4 pb-3 sm:px-5\"><div role=\"progressbar\"",
  "{(state === 'downloading' || state === 'installing') && <div className=\"px-4 pb-3 sm:px-5\"><div role=\"progressbar\"",
);
upd = upd.replace(
  "className=\"h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700\"><div className=\"h-full bg-[#1273b4] transition-[width]\" style={{width:`${Math.max(2,progress)}%`}} /></div>",
  "className=\"h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700\"><div className={`h-full bg-[#1273b4] transition-[width] ${state === 'installing' ? 'animate-pulse' : ''}`} style={{width:`${state === 'installing' ? 100 : Math.max(2,progress)}%`}} /></div>",
);
upd = upd.replace(
  "`Ouverture de l'installation Android…` : `Téléchargement… ${progress}%`",
  "state === 'installing' ? \"Installation en cours… suivez l'installateur Android.\" : `Téléchargement… ${progress}%`",
);
fs.writeFileSync('apps/redaction/src/components/pwa/native-app-update.tsx', upd, 'utf8');
console.log('UPDATE_BANNER', upd.includes("'installing'") && upd.includes('wab-apk-download-progress') ? 'OK' : 'MISS');

// 3) Pont partagé : ne pas simuler 100 % avant le téléchargement natif.
let shared = fs.readFileSync('packages/shared/src/capacitor-app-update.ts', 'utf8');
shared = shared.replace(
  "  if (bridge?.downloadAndInstallApkUpdate) {\n    onProgress?.(100);",
  "  if (bridge?.downloadAndInstallApkUpdate) {",
);
fs.writeFileSync('packages/shared/src/capacitor-app-update.ts', shared, 'utf8');
console.log('SHARED', !shared.includes('onProgress?.(100);') ? 'OK' : 'MISS');
