#!/usr/bin/env node
/**
 * Build AAB release Android pour Google Play (nécessite android/keystore.properties).
 */
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'apps/reader-android/android');
const keystoreProps = join(androidDir, 'keystore.properties');
const aabOut = join(androidDir, 'app/build/outputs/bundle/release/app-release.aab');

if (!existsSync(keystoreProps)) {
  console.error('[bundle] Fichier manquant : apps/reader-android/android/keystore.properties');
  console.error('       Copiez keystore.properties.example et créez le keystore (voir docs/reader-android-app.md)');
  process.exit(1);
}

const sync = spawnSync('npm', ['run', 'cap:sync', '--workspace=apps/reader-android'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});
if (sync.status !== 0) process.exit(sync.status ?? 1);

const patch = spawnSync('node', ['scripts/patch-capacitor-settings.mjs'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});
if (patch.status !== 0) process.exit(patch.status ?? 1);

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const build = spawnSync(gradlew, ['bundleRelease'], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: true,
});

if (build.status !== 0) process.exit(build.status ?? 1);

console.log(`\n[bundle] AAB : ${aabOut.replace(/\\/g, '/')}`);
console.log('[bundle] Play Console → Production ou Test interne → Créer une version → Importer le AAB');
