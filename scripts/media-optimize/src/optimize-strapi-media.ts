/**
 * Recompresse les médias Strapi existants (batch).
 *
 * Usage:
 *   npm run optimize:media
 *   npm run optimize:media -- --dry-run
 *   npm run optimize:media -- --limit=50
 *   npm run optimize:media -- --id=123
 *
 * Variables : STRAPI_URL, STRAPI_API_TOKEN (depuis .env racine ou apps/cms/.env)
 *             ou --strapi-url=https://cms.app.wab-infos.com
 *
 * Strapi conserve hash + extension au replace → même format que l'original (pas de JPG→WebP).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { optimizeImageBuffer } from './image-optimize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const progressPath = path.join(__dirname, '..', '.optimize-progress.json');

const ENV_FILES = [
  path.join(repoRoot, '.env'),
  path.join(repoRoot, '.env.local'),
  path.join(repoRoot, 'apps/cms/.env'),
  path.join(repoRoot, 'apps/cms/.env.local'),
  path.join(repoRoot, 'apps/web/.env.local'),
  path.join(repoRoot, 'apps/redaction/.env.local'),
];

for (const envFile of ENV_FILES) {
  if (!fs.existsSync(envFile)) continue;
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const args = process.argv.slice(2);

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

const STRAPI_URL = (
  readArg('strapi-url') ||
  process.env.STRAPI_URL ||
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  'http://localhost:8090'
).replace(/\/$/, '');
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';

const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const RESET_PROGRESS = args.includes('--reset-progress');
const LIMIT = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0) || Infinity;
const SINGLE_ID = args.find((a) => a.startsWith('--id='))?.split('=')[1];
const PAGE_SIZE = Number(args.find((a) => a.startsWith('--page-size='))?.split('=')[1] || 25);
const MIN_SAVINGS_PERCENT = Number(
  args.find((a) => a.startsWith('--min-savings='))?.split('=')[1] || 5
);

interface StrapiFile {
  id: number;
  name: string;
  url: string;
  mime: string;
  size: number;
  alternativeText?: string | null;
  caption?: string | null;
  ext?: string;
}

interface ProgressState {
  completedIds: number[];
  failed: Record<string, string>;
  stats: {
    scanned: number;
    replaced: number;
    skipped: number;
    failed: number;
    savedBytes: number;
  };
}

function loadProgress(): ProgressState {
  if (RESET_PROGRESS || !fs.existsSync(progressPath)) {
    return {
      completedIds: [],
      failed: {},
      stats: { scanned: 0, replaced: 0, skipped: 0, failed: 0, savedBytes: 0 },
    };
  }
  return JSON.parse(fs.readFileSync(progressPath, 'utf-8')) as ProgressState;
}

function saveProgress(state: ProgressState) {
  fs.writeFileSync(progressPath, JSON.stringify(state, null, 2));
}

function mediaUrl(file: StrapiFile): string {
  if (file.url.startsWith('http')) return file.url;
  return `${STRAPI_URL}${file.url.startsWith('/') ? file.url : `/${file.url}`}`;
}

async function checkStrapiConnection(): Promise<void> {
  const probe = `${STRAPI_URL}/api/upload/files/page?pagination[page]=1&pagination[pageSize]=1`;
  try {
    const res = await fetch(probe, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 401 || res.status === 403) {
      console.error(`Accès refusé (${res.status}) — vérifiez STRAPI_API_TOKEN.`);
      process.exit(1);
    }
    if (!res.ok) {
      const text = await res.text();
      console.error(`Strapi a répondu ${res.status}: ${text.slice(0, 160)}`);
      process.exit(1);
    }
  } catch (err) {
    const code =
      err instanceof Error && 'code' in err
        ? String((err as NodeJS.ErrnoException).code)
        : err instanceof Error && err.cause && typeof err.cause === 'object' && 'code' in err.cause
          ? String((err.cause as NodeJS.ErrnoException).code)
          : '';

    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
      console.error(`Impossible de joindre Strapi à ${STRAPI_URL} (${code}).\n`);
      console.error('Le CMS local n’est pas démarré, ou STRAPI_URL n’est pas configuré.\n');
      console.error('Solutions :');
      console.error('  1. CMS local : npm run dev:cms  (puis relancer le script)');
      console.error('  2. Fichier .env à la racine du projet :');
      console.error('       STRAPI_URL=https://cms.app.wab-infos.com');
      console.error('       STRAPI_API_TOKEN=<token API Strapi>');
      console.error('  3. URL en argument (token toujours dans .env) :');
      console.error('       npm run optimize:media:dry-run -- --strapi-url=https://cms.app.wab-infos.com');
      process.exit(1);
    }
    throw err;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${url} — ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function listImagePage(page: number): Promise<{
  files: StrapiFile[];
  pageCount: number;
  total: number;
}> {
  const params = new URLSearchParams({
    'pagination[page]': String(page),
    'pagination[pageSize]': String(PAGE_SIZE),
    'filters[mime][$startsWith]': 'image/',
    sort: 'id:asc',
  });

  const data = await fetchJson<{
    data: StrapiFile[];
    meta?: { pagination?: { pageCount: number; total: number } };
  }>(`${STRAPI_URL}/api/upload/files/page?${params}`);

  return {
    files: data.data ?? [],
    pageCount: data.meta?.pagination?.pageCount ?? 1,
    total: data.meta?.pagination?.total ?? data.data?.length ?? 0,
  };
}

async function fetchFileById(id: number): Promise<StrapiFile | null> {
  try {
    return await fetchJson<StrapiFile>(`${STRAPI_URL}/api/upload/files/${id}`);
  } catch {
    return null;
  }
}

async function replaceFile(file: StrapiFile, buffer: Buffer, mime: string): Promise<void> {
  const form = new FormData();
  form.append('files', buffer, {
    filename: file.name,
    contentType: mime,
  });

  const fileInfo: Record<string, string> = { name: file.name };
  if (file.alternativeText) fileInfo.alternativeText = file.alternativeText;
  if (file.caption) fileInfo.caption = file.caption;
  form.append('fileInfo', JSON.stringify(fileInfo));

  const res = await fetch(`${STRAPI_URL}/api/upload?id=${file.id}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replace ${file.id} (${res.status}): ${text.slice(0, 200)}`);
  }
}

async function processFile(file: StrapiFile, state: ProgressState): Promise<void> {
  state.stats.scanned += 1;

  const label = `#${file.id} ${file.name} (${(file.size * 1024).toFixed(0)} Ko)`;

  const res = await fetch(mediaUrl(file));
  if (!res.ok) {
    throw new Error(`Téléchargement échoué (${res.status})`);
  }

  const original = Buffer.from(await res.arrayBuffer());
  const optimized = await optimizeImageBuffer(original, file.mime);

  if (optimized.skipped) {
    console.info(`  ⊘ ${label} — ignoré (${optimized.reason})`);
    state.stats.skipped += 1;
    state.completedIds.push(file.id);
    return;
  }

  const savings = original.length - optimized.buffer.length;
  const savingsPercent = original.length > 0 ? (savings / original.length) * 100 : 0;

  if (savingsPercent < MIN_SAVINGS_PERCENT && !FORCE) {
    console.info(`  ⊘ ${label} — gain ${savingsPercent.toFixed(1)}% (< ${MIN_SAVINGS_PERCENT}%)`);
    state.stats.skipped += 1;
    state.completedIds.push(file.id);
    return;
  }

  if (DRY_RUN) {
    console.info(
      `  ○ ${label} — ${(original.length / 1024).toFixed(0)} → ${(optimized.buffer.length / 1024).toFixed(0)} Ko (-${savingsPercent.toFixed(1)}%) [dry-run]`
    );
    state.stats.replaced += 1;
    state.stats.savedBytes += Math.max(0, savings);
    state.completedIds.push(file.id);
    return;
  }

  await replaceFile(file, optimized.buffer, optimized.mime);
  console.info(
    `  ✓ ${label} — ${(original.length / 1024).toFixed(0)} → ${(optimized.buffer.length / 1024).toFixed(0)} Ko (-${savingsPercent.toFixed(1)}%)`
  );
  state.stats.replaced += 1;
  state.stats.savedBytes += Math.max(0, savings);
  state.completedIds.push(file.id);
}

async function main() {
  if (!STRAPI_TOKEN) {
    console.error('STRAPI_API_TOKEN manquant.');
    console.error('Ajoutez-le dans .env à la racine ou apps/cms/.env');
    console.error('(Strapi admin → Settings → API Tokens → Full access)');
    process.exit(1);
  }

  await checkStrapiConnection();

  const state = loadProgress();
  const done = new Set(state.completedIds);

  console.info(`Strapi: ${STRAPI_URL}`);
  console.info(
    `Mode: ${DRY_RUN ? 'dry-run' : 'live'} | min gain: ${MIN_SAVINGS_PERCENT}% | page: ${PAGE_SIZE}`
  );

  let processed = 0;

  if (SINGLE_ID) {
    const file = await fetchFileById(Number(SINGLE_ID));
    if (!file) {
      console.error(`Fichier #${SINGLE_ID} introuvable`);
      process.exit(1);
    }
    try {
      await processFile(file, state);
      saveProgress(state);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ #${file.id}: ${msg}`);
      state.stats.failed += 1;
      state.failed[String(file.id)] = msg;
      saveProgress(state);
      process.exit(1);
    }
    printSummary(state);
    return;
  }

  let page = 1;
  let pageCount = 1;
  let total = 0;

  do {
    const batch = await listImagePage(page);
    pageCount = batch.pageCount;
    total = batch.total;

    if (page === 1) {
      console.info(`Images à parcourir: ${total} (${pageCount} page(s))`);
    }

    for (const file of batch.files) {
      if (processed >= LIMIT) break;
      if (!FORCE && done.has(file.id)) continue;

      try {
        await processFile(file, state);
        saveProgress(state);
        processed += 1;
        if (!DRY_RUN && processed < LIMIT) {
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ #${file.id} ${file.name}: ${msg}`);
        state.stats.failed += 1;
        state.failed[String(file.id)] = msg;
        saveProgress(state);
      }

      if (processed >= LIMIT) break;
    }

    page += 1;
  } while (page <= pageCount && processed < LIMIT);

  printSummary(state);
}

function printSummary(state: ProgressState) {
  const { stats } = state;
  console.info('\n--- Résumé ---');
  console.info(`Scannés    : ${stats.scanned}`);
  console.info(`Remplacés  : ${stats.replaced}`);
  console.info(`Ignorés    : ${stats.skipped}`);
  console.info(`Échecs     : ${stats.failed}`);
  console.info(`Économisé  : ${(stats.savedBytes / 1024 / 1024).toFixed(2)} Mo`);
  console.info(`Progression: ${progressPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
