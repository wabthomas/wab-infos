#!/usr/bin/env node
/**
 * Copie l'APK release vers apps/web/public/downloads/ pour le téléchargement visiteurs.
 * Génère aussi le manifeste de version (détection de mise à jour in-app).
 *
 * Variables :
 *   READER_ANDROID_PRODUCT=reader|redaction (défaut: reader)
 *   READER_ANDROID_APK_FLAVOR=withFcm|noFcm (défaut: withFcm)
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const product = (process.env.READER_ANDROID_PRODUCT || 'reader').trim().toLowerCase();
const pushFlavor = process.env.READER_ANDROID_APK_FLAVOR || 'withFcm';

if (product !== 'reader' && product !== 'redaction') {
  console.error('[copy-apk] READER_ANDROID_PRODUCT invalide (reader|redaction)');
  process.exit(1);
}

const flavorCombo = `${product}${pushFlavor.charAt(0).toUpperCase()}${pushFlavor.slice(1)}`;
const apkSrc = join(
  root,
  `apps/reader-android/android/app/build/outputs/apk/${flavorCombo}/release/app-${product}-${pushFlavor}-release.apk`
);
const buildGradle = join(root, 'apps/reader-android/android/app/build.gradle');
const destDir = join(root, 'apps/web/public/downloads');
const apkFileName = product === 'redaction' ? 'wab-redaction.apk' : 'wab-infos.apk';
const versionFileName =
  product === 'redaction' ? 'wab-redaction-apk-version.json' : 'apk-version.json';
const apkDest = join(destDir, apkFileName);
const versionDest = join(destDir, versionFileName);

if (!existsSync(apkSrc)) {
  console.error('[copy-apk] APK introuvable. Lancez d’abord : npm run reader-android:release');
  console.error(`           Attendu : ${apkSrc}`);
  process.exit(1);
}

function readGradleVersionsForProduct(productName) {
  const gradle = readFileSync(buildGradle, 'utf8');
  const blockMatch = gradle.match(
    new RegExp(`${productName}\\s*\\{[\\s\\S]*?versionCode\\s+(\\d+)[\\s\\S]*?versionName\\s+"([^"]+)"`)
  );
  if (!blockMatch) {
    throw new Error(`versionCode / versionName introuvables pour le flavor ${productName}`);
  }
  return { versionCode: Number(blockMatch[1]), versionName: blockMatch[2] };
}

mkdirSync(destDir, { recursive: true });
copyFileSync(apkSrc, apkDest);

const { versionCode, versionName } = readGradleVersionsForProduct(product);
const apkPublicUrl =
  product === 'redaction'
    ? process.env.NEXT_PUBLIC_REDACTION_ANDROID_APK_URL || '/downloads/wab-redaction.apk'
    : process.env.NEXT_PUBLIC_ANDROID_APK_URL || '/downloads/wab-infos.apk';

const manifest = {
  versionCode,
  versionName,
  apkUrl: apkPublicUrl,
  releaseNotes:
    product === 'redaction'
      ? 'Application native Wab-Redaction.'
      : undefined,
  releasedAt: new Date().toISOString(),
};
writeFileSync(versionDest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const sizeMb = (statSync(apkDest).size / (1024 * 1024)).toFixed(1);
console.log(`[copy-apk] ✅ ${apkDest} (${sizeMb} Mo)`);
console.log(`[copy-apk] ✅ ${versionDest} (v${versionName} / ${versionCode})`);
console.log(`[copy-apk] URL publique : ${apkPublicUrl}`);
