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

if (!process.env.RAYON_NUM_THREADS) process.env.RAYON_NUM_THREADS = '1';
if (!process.env.UV_THREADPOOL_SIZE) process.env.UV_THREADPOOL_SIZE = '1';
if (!process.env.NEXT_CPU_COUNT) process.env.NEXT_CPU_COUNT = '1';
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.GENERATE_SOURCEMAP = 'false';

// 2048 Mo peut provoquer un kill OOM sur mutualisé — défaut 1536, surcharge via BUILD_HEAP_MB
const heapMb = process.env.BUILD_HEAP_MB || '1536';
if (!process.env.NODE_OPTIONS?.includes('max-old-space-size')) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, `--max-old-space-size=${heapMb}`]
    .filter(Boolean)
    .join(' ');
}

const require = createRequire(import.meta.url);
const nextPkg = require.resolve('next/package.json');
const nextBin = path.join(path.dirname(nextPkg), 'dist/bin/next');

console.info(
  `[build] heap=${heapMb}MB RAYON_NUM_THREADS=${process.env.RAYON_NUM_THREADS} ` +
    `UV_THREADPOOL_SIZE=${process.env.UV_THREADPOOL_SIZE} NEXT_CPU_COUNT=${process.env.NEXT_CPU_COUNT}`
);

const result = spawnSync(process.execPath, [nextBin, 'build', '--webpack'], {
  cwd: appDir,
  env: process.env,
  stdio: 'inherit',
});

if (result.signal) {
  console.error(
    `\n[build] Processus tué (${result.signal}). Souvent : mémoire insuffisante sur mutualisé.\n` +
      `  → BUILD_HEAP_MB=1024 npm run build:web\n` +
      `  → npm install --workspace=apps/web --include=optional\n` +
      `  → bash scripts/deploy-server.sh\n`
  );
}

process.exit(result.status ?? 1);
