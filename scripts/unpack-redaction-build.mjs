/**
 * Extrait redaction-next-build.tar.gz dans apps/redaction/.next.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const archive = path.join(root, 'redaction-next-build.tar.gz');
const nextDir = path.join(root, 'apps/redaction/.next');

if (!fs.existsSync(archive)) {
  console.error(`❌ Archive absente : ${archive}`);
  console.error('   En local : npm run build:redaction && npm run pack:redaction-build');
  process.exit(1);
}

if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
}

const result = spawnSync('tar', ['-xzf', archive, '-C', 'apps/redaction'], {
  cwd: root,
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error('❌ Échec extraction tar.');
  process.exit(result.status ?? 1);
}

if (!fs.existsSync(path.join(nextDir, 'BUILD_ID'))) {
  console.error('❌ Archive invalide (BUILD_ID manquant).');
  process.exit(1);
}

const buildId = fs.readFileSync(path.join(nextDir, 'BUILD_ID'), 'utf8').trim();
console.info(`✅ Build extrait → apps/redaction/.next (BUILD_ID=${buildId})`);
console.info('   Redémarrez l’app Node.js (N0C).');
