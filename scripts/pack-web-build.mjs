/**
 * Archive apps/web/.next après un build local (déploiement sans rebuild serveur).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const nextDir = path.join(root, 'apps/web/.next');
const out = path.join(root, 'web-next-build.tar.gz');

if (!fs.existsSync(path.join(nextDir, 'BUILD_ID'))) {
  console.error('❌ Build absent. Lancez d’abord : npm run build:web:low-mem');
  process.exit(1);
}

if (fs.existsSync(out)) fs.unlinkSync(out);

const result = spawnSync('tar', ['-czf', out, '-C', 'apps/web', '.next'], {
  cwd: root,
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error('❌ Échec tar. Sur Windows 10+, tar est inclus ; sinon compressez apps/web/.next manuellement.');
  process.exit(result.status ?? 1);
}

console.info(`✅ Archive créée : ${out}`);
console.info('   Sur le serveur :');
console.info('   cd ~/wab-infos && rm -rf apps/web/.next && tar -xzf web-next-build.tar.gz -C apps/web');
