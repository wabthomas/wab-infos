/**
 * Nettoie archives de déploiement et caches Next.js inutiles en prod.
 * Conserve apps/*/.next/server + static (build prod) si présents.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const NEXT_APPS = ['apps/web', 'apps/redaction'];

const PACK_PATTERNS = [
  /^web-next-build-\d+\.tar\.gz$/,
  /^web-next-build\.tar\.gz$/,
  /^cms-build\.tar\.gz$/,
  /^redaction-next-build-\d+\.tar\.gz$/,
  /^redaction-next-build\.tar\.gz$/,
];

const NEXT_PRUNE = ['dev', 'cache', 'standalone', 'diagnostics', 'trace', 'trace-build', 'types'];

function dirSizeBytes(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSizeBytes(full);
    else if (entry.isFile()) total += fs.statSync(full).size;
  }
  return total;
}

function rmPath(target) {
  if (!fs.existsSync(target)) return 0;
  const before = fs.statSync(target).isDirectory() ? dirSizeBytes(target) : fs.statSync(target).size;
  fs.rmSync(target, { recursive: true, force: true });
  return before;
}

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

const packsOnly = process.argv.includes('--packs-only');

let freed = 0;

for (const file of fs.readdirSync(root)) {
  if (!PACK_PATTERNS.some((re) => re.test(file))) continue;
  const full = path.join(root, file);
  if (!fs.statSync(full).isFile()) continue;
  const size = fs.statSync(full).size;
  fs.unlinkSync(full);
  freed += size;
  console.info(`[clean] archive supprimée : ${file} (${formatMb(size)})`);
}

if (!packsOnly) {
  for (const app of NEXT_APPS) {
    const nextDir = path.join(root, app, '.next');
    for (const name of NEXT_PRUNE) {
      const target = path.join(nextDir, name);
      const removed = rmPath(target);
      if (removed > 0) {
        freed += removed;
        console.info(`[clean] ${app}/.next/${name} (${formatMb(removed)})`);
      }
    }
  }
}

if (freed === 0) {
  console.info('[clean] Rien à supprimer.');
} else {
  console.info(`[clean] Total libéré : ${formatMb(freed)}`);
}
