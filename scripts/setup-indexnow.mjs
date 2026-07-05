/**
 * Génère INDEXNOW_KEY + fichier public/{key}.txt (preuve IndexNow).
 * Usage : node scripts/setup-indexnow.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const webPublic = path.join(root, 'apps/web/public');

const key = crypto.randomBytes(16).toString('hex');
const keyFile = path.join(webPublic, `${key}.txt`);

for (const file of fs.readdirSync(webPublic)) {
  if (/^[a-f0-9]{32}\.txt$/.test(file)) {
    fs.unlinkSync(path.join(webPublic, file));
    console.info(`[indexnow] ancienne clé supprimée : ${file}`);
  }
}

fs.writeFileSync(keyFile, `${key}\n`, 'utf8');
console.info(`[indexnow] Fichier créé : apps/web/public/${key}.txt`);
console.info('');
console.info('Ajoutez dans apps/web/.env (et prod) :');
console.info(`INDEXNOW_KEY=${key}`);
