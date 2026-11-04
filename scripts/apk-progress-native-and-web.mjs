import fs from 'node:fs';

// --- Web : abonnement aux événements natifs + texte d'installation ---
let upd = fs.readFileSync('apps/redaction/src/components/pwa/native-app-update.tsx', 'utf8');
if (!upd.includes('wab-apk-download-progress')) {
  upd = upd.replace(
    "  function dismiss() {",
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

  function dismiss() {`,
  );
}
upd = upd.replace(
  /(await downloadAndInstallApkUpdate\(check\.apkDownloadUrl, setProgress\);)[\s\S]*?setState\('idle'\);/,
  `$1
      if (!usesNativeAndroidUpdateBridge()) setState('idle');`,
);
upd = upd.replace('usesNativeAndroidUpdateBridge() && progress === 100', "state === 'installing'");
fs.writeFileSync('apps/redaction/src/components/pwa/native-app-update.tsx', upd, 'utf8');
console.log('UPD', upd.includes('wab-apk-installing') && upd.includes('state === \'installing\'') ? 'OK' : 'MISS');

// --- Shared : laisser le natif piloter la progression ---
let shared = fs.readFileSync('packages/shared/src/capacitor-app-update.ts', 'utf8');
shared = shared.replace(/\n\s*onProgress\?\.\(100\);/, '');
fs.writeFileSync('packages/shared/src/capacitor-app-update.ts', shared, 'utf8');
console.log('SHARED', shared.includes('onProgress?.(100)') ? 'STILL' : 'OK');

// --- Java : progression du téléchargement et événement d'installation ---
let um = fs.readFileSync('apps/reader-android/android/app/src/main/java/com/wabinfos/app/UpdateManager.java', 'utf8');
if (!um.includes('reportProgress')) {
  um = um.replace(
    "    public static void unbindActivity() {\n        activityRef = null;\n    }",
    `    public static void unbindActivity() {
        activityRef = null;
    }

    private static int lastReportedProgress = -1;

    private static void reportProgress(int percent) {
        Activity activity = activityRef == null ? null : activityRef.get();
        if (activity instanceof MainActivity) ((MainActivity) activity).emitApkUpdateProgress(percent);
    }

    private static void reportInstalling() {
        Activity activity = activityRef == null ? null : activityRef.get();
        if (activity instanceof MainActivity) ((MainActivity) activity).emitApkInstalling();
    }`,
  );
  um = um.replace(
    "                out.write(buffer, 0, read);\n                total += read;",
    `                out.write(buffer, 0, read);
                total += read;
                if (contentLength > 0) {
                    int percent = (int) Math.min(100L, (total * 100L) / contentLength);
                    if (percent >= lastReportedProgress + 2 || percent == 100) {
                        lastReportedProgress = percent;
                        reportProgress(percent);
                    }
                }`,
  );
  um = um.replace(
    "apkFile = downloadApkToCache(appContext, urlToFetch);\n                final File readyFile = apkFile;",
    "apkFile = downloadApkToCache(appContext, urlToFetch);\n                reportInstalling();\n                final File readyFile = apkFile;",
  );
  um = um.replace(
    "        DOWNLOAD_IN_PROGRESS.compareAndSet(false, true)",
    "        lastReportedProgress = -1;\n        DOWNLOAD_IN_PROGRESS.compareAndSet(false, true)",
  );
}
fs.writeFileSync('apps/reader-android/android/app/src/main/java/com/wabinfos/app/UpdateManager.java', um, 'utf8');
console.log('JAVA_UPDATE', um.includes('reportProgress') ? 'OK' : 'MISS');

let ma = fs.readFileSync('apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java', 'utf8');
if (!ma.includes('emitApkUpdateProgress')) {
  ma = ma.replace(
    "    private class NativeBridge {",
    `    public void emitApkUpdateProgress(int percent) {
        runOnUiThread(() -> {
            if (webView == null) return;
            try {
                webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('wab-apk-download-progress',{detail:{percent:" + percent + "}}));", null);
            } catch (Exception ignored) { }
        });
    }

    public void emitApkInstalling() {
        runOnUiThread(() -> {
            if (webView == null) return;
            try {
                webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('wab-apk-installing',{detail:{}}));", null);
            } catch (Exception ignored) { }
        });
    }

    private class NativeBridge {`,
  );
}
fs.writeFileSync('apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java', ma, 'utf8');
console.log('JAVA_MAIN', ma.includes('emitApkUpdateProgress') ? 'OK' : 'MISS');
