import fs from 'node:fs';
let java = fs.readFileSync('apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java', 'utf8');
if (!java.includes('public void openExternalUrl')) {
  java = java.replace(
    /(private class NativeBridge \{\r?\n)/,
    `$1        @android.webkit.JavascriptInterface
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

`,
  );
}
fs.writeFileSync('apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java', java, 'utf8');
console.log(java.includes('public void openExternalUrl') ? 'JAVA_OPEN_OK' : 'MISS');

let gradle = fs.readFileSync('apps/reader-android/android/app/build.gradle', 'utf8');
gradle = gradle.replace('versionCode 16', 'versionCode 17').replace('versionName "1.0.15"', 'versionName "1.0.16"');
fs.writeFileSync('apps/reader-android/android/app/build.gradle', gradle, 'utf8');
console.log(gradle.includes('versionCode 17') ? 'VERSION_OK' : 'MISS');
