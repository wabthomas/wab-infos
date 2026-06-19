/**
 * Build production Next.js sur hébergement à ressources limitées (PlanetHoster, etc.).
 * Limite les threads Rust (SWC, Tailwind Oxide) et Webpack pour éviter :
 *   ThreadPoolBuildError: Resource temporarily unavailable (EAGAIN)
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
if (!process.env.NODE_OPTIONS?.includes('max-old-space-size')) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, '--max-old-space-size=2048']
    .filter(Boolean)
    .join(' ');
}

const require = createRequire(import.meta.url);
const nextPkg = require.resolve('next/package.json');
const nextBin = path.join(path.dirname(nextPkg), 'dist/bin/next');

console.info(
  `[build] RAYON_NUM_THREADS=${process.env.RAYON_NUM_THREADS} ` +
    `UV_THREADPOOL_SIZE=${process.env.UV_THREADPOOL_SIZE} ` +
    `NEXT_CPU_COUNT=${process.env.NEXT_CPU_COUNT}`
);

const result = spawnSync(process.execPath, [nextBin, 'build', '--webpack'], {
  cwd: appDir,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
