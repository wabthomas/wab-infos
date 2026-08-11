#!/usr/bin/env node
/**
 * Installe GOOGLE_INDEXING_* depuis apps/web/.google-indexing-sa.json
 * dans un fichier .env (local ou distant).
 *
 * Usage:
 *   node scripts/install-google-indexing-env.mjs apps/web/.env.local
 *   node scripts/install-google-indexing-env.mjs path/to/.env path/to/autre.env
 */
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const saPath = path.join(repoRoot, 'apps/web/.google-indexing-sa.json');

if (!fs.existsSync(saPath)) {
  console.error('Manquant:', saPath);
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
if (!sa.client_email || !String(sa.private_key || '').includes('BEGIN PRIVATE KEY')) {
  console.error('JSON service account invalide');
  process.exit(1);
}

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('Usage: node scripts/install-google-indexing-env.mjs <env-file>...');
  process.exit(1);
}

function upsert(file, entries) {
  let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (text.length && !text.endsWith('\n')) text += '\n';

  text = text.replace(/^GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON=.*\r?\n?/m, '');

  for (const [key, value] of Object.entries(entries)) {
    const line = `${key}=${JSON.stringify(value)}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(text)) text = text.replace(re, line);
    else text += `${line}\n`;
  }

  fs.writeFileSync(file, text);
  console.log('updated', file);
}

const entries = {
  GOOGLE_INDEXING_CLIENT_EMAIL: sa.client_email,
  GOOGLE_INDEXING_PRIVATE_KEY: sa.private_key,
};

for (const target of targets) {
  const abs = path.isAbsolute(target) ? target : path.join(repoRoot, target);
  upsert(abs, entries);
}

console.log('email_ok', sa.client_email);
console.log('key_id_ok', sa.private_key_id);
console.log('private_key_chars', sa.private_key.length);
