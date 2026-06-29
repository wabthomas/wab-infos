/**
 * Force les chemins monorepo dans capacitor.settings.gradle (racine node_modules).
 * cap sync peut régénérer ../node_modules ou ../../../../../node_modules.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'apps/reader-android/android/capacitor.settings.gradle');
const NODE_MODULES = '../../../node_modules/';

let content = readFileSync(file, 'utf8');
const patched = content.replace(
  /projectDir = new File\('([^']+)'\)/g,
  (match, relPath) => {
    if (!relPath.includes('node_modules/')) return match;
    const idx = relPath.indexOf('node_modules/');
    const tail = relPath.slice(idx + 'node_modules/'.length);
    return `projectDir = new File('${NODE_MODULES}${tail}')`;
  }
);

if (patched !== content) {
  writeFileSync(file, patched, 'utf8');
  console.info('[patch-capacitor-settings] Chemins corrigés → ../../../node_modules');
} else {
  console.info('[patch-capacitor-settings] Chemins déjà OK (../../../node_modules)');
}

const sample = join(root, 'apps/reader-android/android', NODE_MODULES, '@capacitor/android/capacitor');
if (!existsSync(sample)) {
  console.error('[patch-capacitor-settings] Introuvable :', sample);
  console.error('         Lancez npm install à la racine du monorepo.');
  process.exit(1);
}
