/**
 * Build production Next.js sur hébergement à ressources limitées (PlanetHoster, etc.).
 * Limite les threads Rust (SWC, Tailwind Oxide) et Webpack pour éviter :
 *   ThreadPoolBuildError: Resource temporarily unavailable (EAGAIN)
 *   SIGABRT / OOM pendant "Collecting page data"
 *
 * Mutualisé : tout en un seul processus Node (pas de spawn compile-css / next bin)
 * pour rester sous maxEntryProcs CloudLinux.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, '..');
const compiledCssPath = path.join(appDir, 'src/app/globals.compiled.css');
const compileCssModule = pathToFileURL(path.join(__dirname, 'compile-css.mjs')).href;

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

function printEagainHelp() {
  console.error(
    `\n[build] Erreur EAGAIN / spawn ? Limite de processus CloudLinux (pas la RAM).\n` +
      `  → Recommandé : build local + archive\n` +
      `       npm run build:web && npm run pack:web-build\n` +
      `       uploadez web-next-build.tar.gz puis : npm run unpack:web-build\n` +
      `  → Ou contacter PlanetHoster : augmenter maxEntryProcs / PMEM\n` +
      `  → LOW_MEM_BUILD=1 BUILD_HEAP_MB=768 npm run build:web\n`
  );
}

async function ensureCompiledCss() {
  const force = process.env.FORCE_CSS_COMPILE === '1';
  if (!force && fs.existsSync(compiledCssPath)) {
    const kb = (fs.statSync(compiledCssPath).size / 1024).toFixed(0);
    console.info(
      `[build] CSS précompilé présent (${kb} Ko) — skip Tailwind (FORCE_CSS_COMPILE=1 pour regénérer)`
    );
    process.env.PRECOMPILED_CSS = '1';
    return;
  }

  console.info('[build] Compilation Tailwind (in-process, pas de spawn)…');
  await import(compileCssModule);
  process.env.PRECOMPILED_CSS = '1';
}

async function runNextBuild() {
  process.chdir(appDir);
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  process.env.NEXT_RUNTIME = 'nodejs';

  const { nextBuild } = await import('next/dist/cli/next-build.js');
  // Mêmes défauts que `next build --webpack` (commander / NextBuildOptions)
  await nextBuild(
    {
      webpack: true,
      mangling: true,
      experimentalDebugMemoryUsage: false,
      experimentalBuildMode: 'default',
    },
    undefined
  );
}

async function main() {
  try {
    if (process.env.LOW_MEM_BUILD === '1') {
      await ensureCompiledCss();
    }

    await runNextBuild();
    process.exit(0);
  } catch (err) {
    const msg = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
    const syscall = err && typeof err === 'object' && 'syscall' in err ? String(err.syscall) : '';
    if (msg === 'EAGAIN' || syscall.includes('spawn')) {
      printEagainHelp();
    } else if (err && typeof err === 'object' && 'signal' in err && err.signal) {
      console.error(
        `\n[build] Processus tué (${err.signal}). Souvent : mémoire insuffisante sur mutualisé.\n` +
          `  → git pull && LOW_MEM_BUILD=1 BUILD_HEAP_MB=768 npm run build:web\n` +
          `  → npm run build:web:low-mem\n` +
          `  → Builder en local : npm run build:web && npm run pack:web-build\n`
      );
    } else {
      console.error(err);
      printEagainHelp();
    }
    process.exit(1);
  }
}

process.on('uncaughtException', (err) => {
  if (err?.code === 'EAGAIN' || err?.syscall?.includes?.('spawn')) {
    printEagainHelp();
    process.exit(1);
  }
  throw err;
});

await main();
