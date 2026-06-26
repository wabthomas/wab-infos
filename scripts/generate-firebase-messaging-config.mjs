/**
 * Génère public/firebase-messaging-config.js (web ou redaction) depuis les variables d'environnement.
 * Ne pas committer le fichier généré (voir .gitignore).
 *
 * Usage : node scripts/generate-firebase-messaging-config.mjs [apps/web|apps/redaction]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRel = process.argv[2] || 'apps/web';
const appDir = path.join(repoRoot, appRel);
const outPath = path.join(appDir, 'public', 'firebase-messaging-config.js');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const fileEnv = {
  ...loadEnvFile(path.join(repoRoot, '.env')),
  ...loadEnvFile(path.join(repoRoot, '.env.local')),
  ...loadEnvFile(path.join(appDir, '.env.local')),
};
const env = { ...fileEnv, ...process.env };

const config = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || '',
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || '',
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || '',
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || '',
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || '',
};

const storageBucket = env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
if (storageBucket) {
  config.storageBucket = storageBucket;
}

const content = `/** Généré par npm run pwa:fcm — ne pas éditer ni committer. */
self.FIREBASE_CONFIG = ${JSON.stringify(config, null, 2)};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, content, 'utf8');

const ok = Boolean(config.apiKey && config.projectId);
const relOut = path.relative(repoRoot, outPath);
console.log(
  ok
    ? `✓ ${relOut}`
    : `⚠ ${relOut} (Firebase incomplet — définir NEXT_PUBLIC_FIREBASE_* dans .env.local)`
);
