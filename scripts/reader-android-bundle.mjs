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
const flavor = existsSync(googleServices) ? 'withFcm' : 'noFcm';
const aabOut = join(
  androidDir,
  `app/build/outputs/bundle/${flavor}Release/app-${flavor}-release.aab`
);

if (!existsSync(keystoreProps)) {
  console.error('[bundle] Fichier manquant : apps/reader-android/android/keystore.properties');
  process.exit(1);
}

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const task = `bundle${flavor.charAt(0).toUpperCase()}${flavor.slice(1)}Release`;
const build = spawnSync(gradlew, [task], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: true,
});

if (build.status !== 0) process.exit(build.status ?? 1);

console.log(`\n[bundle] Flavor : ${flavor}`);
console.log(`[bundle] AAB : ${aabOut.replace(/\\/g, '/')}`);
console.log('[bundle] Play Console → Production ou Test interne → Créer une version → Importer le AAB');
