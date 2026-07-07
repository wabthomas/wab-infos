#!/usr/bin/env node
/**
 * Build APK release Android (WebView native + FCM).
 * Nécessite android/keystore.properties et google-services.json pour withFcm.
 */
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'apps/reader-android/android');
const keystoreProps = join(androidDir, 'keystore.properties');
const googleServices = join(androidDir, 'app/google-services.json');
const flavor = existsSync(googleServices) ? 'withFcm' : 'noFcm';
const apkOut = join(
  androidDir,
  `app/build/outputs/apk/${flavor}/release/app-${flavor}-release.apk`
);

if (!existsSync(keystoreProps)) {
  console.error('[release] Fichier manquant : apps/reader-android/android/keystore.properties');
  console.error('        Copiez keystore.properties.example (voir docs/reader-android-app.md)');
  process.exit(1);
}

if (!existsSync(googleServices)) {
  console.warn('[release] google-services.json absent → build noFcm (sans push FCM)');
}

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const task = `assemble${flavor.charAt(0).toUpperCase()}${flavor.slice(1)}Release`;
const build = spawnSync(gradlew, [task], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: true,
});

if (build.status !== 0) process.exit(build.status ?? 1);

console.log(`\n[release] Flavor : ${flavor}`);
console.log(`[release] APK : ${apkOut.replace(/\\/g, '/')}`);

const copyApk = spawnSync('node', ['scripts/copy-apk-to-web.mjs'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, READER_ANDROID_APK_FLAVOR: flavor },
});
if (copyApk.status !== 0) process.exit(copyApk.status ?? 1);
