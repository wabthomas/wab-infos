#!/usr/bin/env node
/**
 * Affiche l'empreinte SHA-1 du keystore release (Google Cloud OAuth Android).
 * Usage : npm run reader-android:sha1
 * Le mot de passe est lu depuis android/keystore.properties (pas besoin de le retaper).
 */
import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'apps/reader-android/android');
const propsPath = join(androidDir, 'keystore.properties');

if (!existsSync(propsPath)) {
  console.error('[sha1] Fichier manquant : apps/reader-android/android/keystore.properties');
  console.error('        Copiez keystore.properties.example et renseignez le keystore release.');
  process.exit(1);
}

const props = Object.fromEntries(
  readFileSync(propsPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
);

const storeFile = props.storeFile;
const storePassword = props.storePassword;
const keyAlias = props.keyAlias || 'wabinfos';

if (!storeFile || !storePassword) {
  console.error('[sha1] keystore.properties incomplet (storeFile, storePassword requis).');
  process.exit(1);
}

const keystore = join(androidDir, storeFile);
if (!existsSync(keystore)) {
  console.error(`[sha1] Keystore introuvable : ${keystore}`);
  process.exit(1);
}

const keytoolCandidates = [
  process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', 'keytool.exe') : null,
  'C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\keytool.exe',
  'keytool',
].filter(Boolean);

let keytool = 'keytool';
for (const candidate of keytoolCandidates) {
  if (candidate === 'keytool' || existsSync(candidate)) {
    keytool = candidate;
    break;
  }
}

const result = spawnSync(
  keytool,
  ['-list', '-v', '-keystore', keystore, '-alias', keyAlias, '-storepass', storePassword],
  { encoding: 'utf8' }
);

if (result.status !== 0) {
  console.error('[sha1] keytool a échoué — mot de passe incorrect ou keystore invalide.');
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(result.status ?? 1);
}

const sha1 =
  result.stdout.match(/SHA1:\s*([0-9A-F:]+)/i)?.[1] ||
  result.stdout.match(/SHA 1:\s*([0-9A-F:]+)/i)?.[1];
const sha256 =
  result.stdout.match(/SHA256:\s*([0-9A-F:]+)/i)?.[1] ||
  result.stdout.match(/SHA 256:\s*([0-9A-F:]+)/i)?.[1];

if (!sha1) {
  console.log(result.stdout.trim());
  console.error('\n[sha1] Empreinte SHA-1 introuvable dans la sortie keytool.');
  process.exit(1);
}

console.log('\n[sha1] Keystore release — Google Cloud OAuth Android');
console.log(`       Fichier : ${keystore.replace(/\\/g, '/')}`);
if (sha1) console.log(`\n       SHA-1   : ${sha1}`);
if (sha256) console.log(`       SHA-256 : ${sha256}`);
console.log('\n       Google Cloud → Credentials → OAuth client ID → Android');
console.log('       1) Package com.wabinfos.app         + SHA-1 (app lecteur)');
console.log('       2) Package com.wabinfos.redaction   + même SHA-1 (Wab-Redaction)');
console.log('          → requis pour activer Google Sign-In natif dans Wab-Redaction\n');
