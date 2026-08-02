#!/usr/bin/env node
/**
 * Build AAB release Android pour Google Play.
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
  console.error('[bundle] READER_ANDROID_PRODUCT invalide (reader|redaction)');
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
const aabOut = join(
  androidDir,
  `app/build/outputs/bundle/${flavorCombo}Release/app-${product}-${pushFlavor}-release.aab`
);

if (!existsSync(keystoreProps)) {
  console.error('[bundle] Fichier manquant : apps/reader-android/android/keystore.properties');
  process.exit(1);
}

if (product !== 'redaction' && !existsSync(googleServices)) {
  console.warn('[bundle] google-services.json absent → build noFcm (sans push FCM)');
}

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const task = `bundle${flavorCombo.charAt(0).toUpperCase()}${flavorCombo.slice(1)}Release`;
const build = spawnSync(gradlew, [task], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: true,
});

if (build.status !== 0) process.exit(build.status ?? 1);

console.log(`\n[bundle] Product : ${product}`);
console.log(`[bundle] Push : ${pushFlavor}`);
console.log(`[bundle] AAB : ${aabOut.replace(/\\/g, '/')}`);
console.log('[bundle] Play Console → Production ou Test interne → Créer une version → Importer le AAB');
