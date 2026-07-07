/**
 * Archive apps/redaction/.next après un build local (déploiement sans rebuild serveur).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const nextDir = path.join(root, 'apps/redaction/.next');
const outDefault = path.join(root, 'redaction-next-build.tar.gz');
let out = outDefault;

const EXCLUDE = [
  '.next/dev',
  '.next/cache',
  '.next/standalone',
  '.next/diagnostics',
  '.next/types',
  '.next/trace',
  '.next/trace-build',
];

function removeStalePacks() {
  for (const file of fs.readdirSync(root)) {
    if (!/^redaction-next-build-\d+\.tar\.gz$/.test(file)) continue;
    try {
      fs.unlinkSync(path.join(root, file));
      console.info(`[pack] archive orpheline supprimée : ${file}`);
    } catch {
      // ignoré
    }
  }
}

if (!fs.existsSync(path.join(nextDir, 'BUILD_ID'))) {
  console.error('❌ Build absent. Lancez d’abord : npm run build:redaction');
  process.exit(1);
}

if (fs.existsSync(out)) {
  try {
    fs.unlinkSync(out);
  } catch {
    const fallback = path.join(root, `redaction-next-build-${Date.now()}.tar.gz`);
    console.warn(`[pack] ${path.basename(out)} verrouillé — création de ${path.basename(fallback)}`);
    out = fallback;
  }
}

const tarArgs = ['-czf', out];
for (const pattern of EXCLUDE) {
  tarArgs.push(`--exclude=${pattern}`);
}
tarArgs.push('-C', 'apps/redaction', '.next');

console.info('[pack] Exclusions :', EXCLUDE.map((e) => e.replace('.next/', '')).join(', '));

const result = spawnSync('tar', tarArgs, {
  cwd: root,
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error('❌ Échec tar.');
  process.exit(result.status ?? 1);
}

const sizeMb = (fs.statSync(out).size / (1024 * 1024)).toFixed(1);
removeStalePacks();
console.info(`✅ Archive créée : ${out} (${sizeMb} Mo)`);
console.info('   Sur le serveur (sans npm) :');
console.info('   cd ~/wab-infos && rm -rf apps/redaction/.next && tar -xzf redaction-next-build.tar.gz -C apps/redaction');
