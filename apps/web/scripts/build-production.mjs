/**
 * Build production Next.js sur hébergement à ressources limitées (PlanetHoster, etc.).
 * Limite les threads Rust (SWC, Tailwind Oxide) et Webpack pour éviter :
 *   ThreadPoolBuildError: Resource temporarily unavailable (EAGAIN)
 *   SIGABRT / OOM pendant "Collecting page data"
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, '..');

if (process.argv.includes('--low-mem')) {
  process.env.LOW_MEM_BUILD = '1';
  if (!process.env.BUILD_HEAP_MB) process.env.BUILD_HEAP_MB = '768';
}

// PlanetHoster / CloudLinux : même commande `npm run build:web` qu'en local, mais le serveur
// a des limites de processus (EAGAIN). Sur Linux, activer low-mem sauf si LOW_MEM_BUILD=0.
if (
  process.env.LOW_MEM_BUILD === undefined &&
  process.platform === 'linux' &&
  process.env.CI !== 'true'
) {
  process.env.LOW_MEM_BUILD = '1';
  if (!process.env.BUILD_HEAP_MB) process.env.BUILD_HEAP_MB = '768';
  console.info(
    '[build] Linux détecté → LOW_MEM_BUILD=1 automatique (serveur mutualisé). ' +
      'Build complet en local : LOW_MEM_BUILD=0 npm run build:web'
  );
}

if (!process.env.RAYON_NUM_THREADS) process.env.RAYON_NUM_THREADS = '1';
if (!process.env.UV_THREADPOOL_SIZE) process.env.UV_THREADPOOL_SIZE = '1';
if (!process.env.NEXT_CPU_COUNT) process.env.NEXT_CPU_COUNT = '1';
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.GENERATE_SOURCEMAP = 'false';

// 2048 Mo peut provoquer un kill OOM sur mutualisé — défaut 1536, surcharge via BUILD_HEAP_MB
const heapMb =
  process.env.BUILD_HEAP_MB ||
  (process.env.LOW_MEM_BUILD === '1' ? '768' : '1536');
if (!process.env.NODE_OPTIONS?.includes('max-old-space-size')) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, `--max-old-space-size=${heapMb}`]
    .filter(Boolean)
    .join(' ');
}

const require = createRequire(import.meta.url);
const nextPkg = require.resolve('next/package.json');
const nextBin = path.join(path.dirname(nextPkg), 'dist/bin/next');

console.info(
  `[build] heap=${heapMb}MB LOW_MEM_BUILD=${process.env.LOW_MEM_BUILD ?? '0'} ` +
    `(typescript=${process.env.LOW_MEM_BUILD === '1' ? 'skip' : 'check'}) ` +
    `RAYON_NUM_THREADS=${process.env.RAYON_NUM_THREADS} ` +
    `UV_THREADPOOL_SIZE=${process.env.UV_THREADPOOL_SIZE} NEXT_CPU_COUNT=${process.env.NEXT_CPU_COUNT}`
);

if (process.env.LOW_MEM_BUILD === '1' && Number(heapMb) < 768) {
  console.warn(
    `[build] BUILD_HEAP_MB=${heapMb} est bas pour mutualisé — préférez 768 (512 provoque souvent SIGABRT).`
  );
}

if (process.env.LOW_MEM_BUILD === '1') {
  console.info('[build] Compilation Tailwind (processus séparé, évite EAGAIN CloudLinux)…');
  const cssResult = spawnSync(process.execPath, [path.join(__dirname, 'compile-css.mjs')], {
    cwd: appDir,
    env: process.env,
    stdio: 'inherit',
  });
  if (cssResult.status !== 0) {
    console.error(
      '[build] Échec compile-css. Limite de processus CloudLinux (EAGAIN) ?\n' +
        '  → Contacter PlanetHoster pour augmenter maxEntryProcs / nproc\n' +
        '  → Ou builder en local puis déployer le dossier .next'
    );
    process.exit(cssResult.status ?? 1);
  }
  process.env.PRECOMPILED_CSS = '1';
}

const result = spawnSync(process.execPath, [nextBin, 'build', '--webpack'], {
  cwd: appDir,
  env: process.env,
  stdio: 'inherit',
});

if (result.signal) {
  console.error(
    `\n[build] Processus tué (${result.signal}). Souvent : mémoire insuffisante sur mutualisé.\n` +
      `  → git pull && LOW_MEM_BUILD=1 BUILD_HEAP_MB=768 npm run build:web\n` +
      `  → npm run build:web:low-mem\n` +
      `  → Éviter BUILD_HEAP_MB=512 (trop bas, SIGABRT fréquent)\n` +
      `  → Ajouter du swap Linux si possible (1–2 Go)\n` +
      `  → npm install --workspace=apps/web --include=optional\n`
  );
}

if (result.status !== 0 && !result.signal) {
  console.error(
    `\n[build] Erreur EAGAIN / spawn ? Limite de processus CloudLinux (pas la RAM).\n` +
      `  → Contacter PlanetHoster : augmenter maxEntryProcs / PMEM pour votre compte\n` +
      `  → LOW_MEM_BUILD=1 BUILD_HEAP_MB=768 npm run build:web\n` +
      `  → Builder en local : npm run build:web puis uploader apps/web/.next\n`
  );
}

process.exit(result.status ?? 1);
