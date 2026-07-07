/**
 * Archive apps/cms/dist après un build local (admin Strapi + serveur compilé).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'apps/cms/dist');
const adminIndex = path.join(distDir, 'build/index.html');
const out = path.join(root, 'cms-build.tar.gz');

if (!fs.existsSync(adminIndex)) {
  console.error('❌ Build CMS absent. Lancez d’abord : npm run build:cms');
  process.exit(1);
}

if (fs.existsSync(out)) fs.unlinkSync(out);

const result = spawnSync('tar', ['-czf', out, '-C', 'apps/cms', 'dist'], {
  cwd: root,
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error('❌ Échec tar.');
  process.exit(result.status ?? 1);
}

console.info(`✅ Archive créée : ${out}`);
console.info('   Uploadez sur le serveur (~/wab-infos/) puis : bash scripts/deploy-server.sh');
