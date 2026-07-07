/**
 * Build Strapi admin (Vite/esbuild) avec limites adaptées au mutualisé.
 * Sur CloudLinux, ce build échoue souvent — utiliser pack:cms-build en local.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const cmsDir = path.join(root, 'apps/cms');

const heapMb = process.env.CMS_BUILD_HEAP_MB || '1536';

if (!process.env.UV_THREADPOOL_SIZE) process.env.UV_THREADPOOL_SIZE = '1';
if (!process.env.RAYON_NUM_THREADS) process.env.RAYON_NUM_THREADS = '1';
process.env.NODE_OPTIONS = [
  process.env.NODE_OPTIONS,
  `--max-old-space-size=${heapMb}`,
]
  .filter(Boolean)
  .join(' ')
  .trim();

console.info(
  `[cms-build] heap=${heapMb}MB UV_THREADPOOL_SIZE=${process.env.UV_THREADPOOL_SIZE} ` +
    `RAYON_NUM_THREADS=${process.env.RAYON_NUM_THREADS}`
);

const require = createRequire(path.join(cmsDir, 'package.json'));
let strapiBin;
try {
  const strapiPkg = require.resolve('@strapi/strapi/package.json');
  strapiBin = path.join(path.dirname(strapiPkg), 'bin/strapi.js');
} catch {
  console.error('[cms-build] @strapi/strapi introuvable. Lancez: npm install --prefix apps/cms');
  process.exit(1);
}

try {
  require.resolve('@vitejs/plugin-react-swc', { paths: [cmsDir] });
} catch {
  console.error(
    '[cms-build] @vitejs/plugin-react-swc manquant (requis pour le panel admin Strapi).\n' +
      '  → Lancez : npm install --prefix apps/cms'
  );
  process.exit(1);
}

const typegen = spawnSync(process.execPath, [strapiBin, 'ts:generate-types'], {
  cwd: cmsDir,
  env: process.env,
  stdio: 'inherit',
});

if (typegen.status !== 0 || typegen.signal) {
  console.error('[cms-build] Échec de la génération des types Strapi (ts:generate-types).');
  process.exit(typegen.status ?? 1);
}

const result = spawnSync(process.execPath, [strapiBin, 'build'], {
  cwd: cmsDir,
  env: process.env,
  stdio: 'inherit',
});

if (result.status !== 0 || result.signal) {
  console.error(
    '\n[cms-build] Échec (esbuild « The service was stopped » = OOM ou limite CloudLinux).\n' +
      '  → Builder en local : npm run build:cms && npm run pack:cms-build\n' +
      '  → Uploader cms-build.tar.gz sur le serveur, puis relancer deploy-server.sh\n' +
      '  → Ou SKIP_CMS_BUILD=1 si apps/cms/build est déjà à jour\n'
  );
  process.exit(result.status ?? 1);
}

console.info('[cms-build] OK → apps/cms/dist (admin dans dist/build)');
