/**
 * Extrait web-next-build.tar.gz dans apps/web/.next (déploiement sans rebuild serveur).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const archive = path.join(root, 'web-next-build.tar.gz');
const nextDir = path.join(root, 'apps/web/.next');

if (!fs.existsSync(archive)) {
  console.error(`❌ Archive absente : ${archive}`);
  console.error('   En local : npm run build:web && npm run pack:web-build');
  process.exit(1);
}

if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
}

const result = spawnSync('tar', ['-xzf', archive, '-C', 'apps/web'], {
  cwd: root,
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error('❌ Échec extraction tar.');
  process.exit(result.status ?? 1);
}

if (!fs.existsSync(path.join(nextDir, 'BUILD_ID'))) {
  console.error('❌ Archive invalide (BUILD_ID manquant dans apps/web/.next).');
  process.exit(1);
}

const buildId = fs.readFileSync(path.join(nextDir, 'BUILD_ID'), 'utf8').trim();
console.info(`✅ Build extrait → apps/web/.next (BUILD_ID=${buildId})`);
console.info('   Redémarrez l’app Node.js (N0C / PM2).');
