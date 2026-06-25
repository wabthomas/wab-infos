/**
 * Génère public/firebase-messaging-config.js depuis .env.local
 * Usage : node scripts/generate-firebase-messaging-config.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env.local');
const outPath = path.join(root, 'public', 'firebase-messaging-config.js');

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

const env = { ...process.env, ...loadEnvFile(envPath) };

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

const content = `/** Généré par npm run pwa:fcm — ne pas éditer à la main. */
self.FIREBASE_CONFIG = ${JSON.stringify(config, null, 2)};
`;

fs.writeFileSync(outPath, content, 'utf8');

const ok = Boolean(config.apiKey && config.projectId);
console.log(ok ? `✓ ${path.relative(root, outPath)}` : `⚠ ${path.relative(root, outPath)} (Firebase incomplet dans .env.local)`);
