/**
 * Vérifie la configuration apps/web (.env.local) sans afficher les secrets.
 * Usage : node scripts/check-web-env.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env.local');

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

function isSet(key) {
  const v = env[key]?.trim();
  return Boolean(v && !/^(your-|change-me|xxx|$)/i.test(v) && v !== '');
}

function isSmtpConfigured() {
  return (
    isSet('SMTP_HOST') &&
    isSet('SMTP_USER') &&
    isSet('SMTP_PASS') &&
    isSet('NEWSLETTER_SENDER_EMAIL')
  );
}

const checks = [
  { label: 'STRAPI_API_TOKEN', ok: isSet('STRAPI_API_TOKEN'), required: true },
  { label: 'REVALIDATION_SECRET', ok: isSet('REVALIDATION_SECRET'), required: true },
  { label: 'NEWSLETTER_ENABLED', ok: env.NEWSLETTER_ENABLED === 'true', required: true },
  { label: 'NEWSLETTER_SEND_ON_PUBLISH (web)', ok: env.NEWSLETTER_SEND_ON_PUBLISH === 'true', required: false },
  { label: 'SMTP (host, user, pass)', ok: isSmtpConfigured(), required: true },
  { label: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY', ok: isSet('NEXT_PUBLIC_VAPID_PUBLIC_KEY'), required: true },
  { label: 'VAPID_PRIVATE_KEY', ok: isSet('VAPID_PRIVATE_KEY'), required: true },
  { label: 'PUSH_SEND_ON_PUBLISH (web)', ok: env.PUSH_SEND_ON_PUBLISH === 'true', required: false },
];

console.log(`\n📋 Vérification ${path.relative(process.cwd(), envPath)}\n`);

let hasError = false;
for (const { label, ok, required } of checks) {
  const icon = ok ? '✓' : required ? '✗' : '○';
  const status = ok ? 'OK' : required ? 'MANQUANT' : 'optionnel';
  console.log(`  ${icon} ${label.padEnd(32)} ${status}`);
  if (required && !ok) hasError = true;
}

console.log('\n📌 CMS (apps/cms/.env) — à vérifier séparément :');
console.log('  • NEWSLETTER_SEND_ON_PUBLISH=true');
console.log('  • PUSH_SEND_ON_PUBLISH=true');
console.log('  • REVALIDATION_SECRET identique au web');
console.log('  • NEXT_PUBLIC_SITE_URL=https://wab-infos.com');
console.log('  • Token API : droits reader-push-subscription (find, create, update, delete)\n');

async function probeReaderPushApi() {
  const strapiUrl = env.STRAPI_URL || env.NEXT_PUBLIC_STRAPI_URL;
  const token = env.STRAPI_API_TOKEN?.trim();
  if (!strapiUrl || !token) return;

  try {
    const res = await fetch(
      `${strapiUrl.replace(/\/$/, '')}/api/reader-push-subscriptions?pagination[pageSize]=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.status === 404) {
      console.log('  ✗ reader-push-subscriptions (Strapi)  ABSENT — rebuild CMS requis');
      hasError = true;
    } else if (res.status === 403 || res.status === 401) {
      console.log('  ✗ reader-push-subscriptions (Strapi)  Token API sans droits');
      hasError = true;
    } else if (res.ok) {
      console.log('  ✓ reader-push-subscriptions (Strapi)  OK');
    } else {
      console.log(`  ○ reader-push-subscriptions (Strapi)  HTTP ${res.status}`);
    }
  } catch {
    console.log('  ○ reader-push-subscriptions (Strapi)  injoignable depuis cette machine');
  }
}

await probeReaderPushApi();
console.log('');

if (hasError) {
  console.log('⚠️  Configuration incomplète — newsletter / alertes push ne fonctionneront pas en prod.\n');
  console.log('   VAPID : npx web-push generate-vapid-keys');
  console.log('   SMTP  : renseigner SMTP_PASS (boîte newsletter@wab-infos.com)\n');
  process.exit(1);
}

console.log('✅ Configuration web complète pour newsletter et push.\n');
