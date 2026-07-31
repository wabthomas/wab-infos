#!/usr/bin/env node
/**
 * Build APK release Android (WebView native + FCM).
 * Product : reader (défaut) | redaction via READER_ANDROID_PRODUCT=redaction
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
const product = (process.env.READER_ANDROID_PRODUCT || 'reader').trim().toLowerCase();
if (product !== 'reader' && product !== 'redaction') {
  console.error('[release] READER_ANDROID_PRODUCT invalide (reader|redaction)');
  process.exit(1);
}
// Wab-Redaction : noFcm tant que Firebase n’a pas d’app Android com.wabinfos.redaction.
const pushFlavor =
  product === 'redaction'
    ? 'noFcm'
    : existsSync(googleServices)
      ? 'withFcm'
      : 'noFcm';
const flavorCombo = `${product}${pushFlavor.charAt(0).toUpperCase()}${pushFlavor.slice(1)}`;
const apkOut = join(
  androidDir,
  `app/build/outputs/apk/${flavorCombo}/release/app-${product}-${pushFlavor}-release.apk`
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
const task = `assemble${flavorCombo.charAt(0).toUpperCase()}${flavorCombo.slice(1)}Release`;
const buildEnv =
  process.platform === 'win32'
    ? {
        ...process.env,
        JAVA_TOOL_OPTIONS: [process.env.JAVA_TOOL_OPTIONS, '-Djavax.net.ssl.trustStoreType=Windows-ROOT']
          .filter(Boolean)
          .join(' '),
      }
    : process.env;
const build = spawnSync(gradlew, [task], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: true,
  env: buildEnv,
});

if (build.status !== 0) process.exit(build.status ?? 1);

console.log(`\n[release] Product : ${product}`);
console.log(`[release] Push : ${pushFlavor}`);
console.log(`[release] APK : ${apkOut.replace(/\\/g, '/')}`);

const copyApk = spawnSync('node', ['scripts/copy-apk-to-web.mjs'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    READER_ANDROID_PRODUCT: product,
    READER_ANDROID_APK_FLAVOR: pushFlavor,
  },
});
if (copyApk.status !== 0) process.exit(copyApk.status ?? 1);
