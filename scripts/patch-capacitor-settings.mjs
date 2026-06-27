/**
 * Force les chemins monorepo dans capacitor.settings.gradle (racine node_modules).
 * cap sync peut régénérer ../node_modules si apps/reader-android/node_modules existe.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'apps/reader-android/android/capacitor.settings.gradle');

let content = readFileSync(file, 'utf8');
const patched = content.replaceAll('../node_modules/', '../../../node_modules/');

if (patched === content) {
  console.info('[patch-capacitor-settings] Chemins déjà OK (../../../node_modules)');
} else {
  writeFileSync(file, patched, 'utf8');
  console.info('[patch-capacitor-settings] Chemins corrigés → ../../../node_modules');
}
