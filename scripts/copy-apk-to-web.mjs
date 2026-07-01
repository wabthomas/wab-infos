#!/usr/bin/env node
/**
 * Copie l'APK release vers apps/web/public/downloads/ pour le téléchargement visiteurs.
 * Génère aussi apk-version.json (détection de mise à jour in-app).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apkSrc = join(
  root,
  'apps/reader-android/android/app/build/outputs/apk/release/app-release.apk'
);
const buildGradle = join(root, 'apps/reader-android/android/app/build.gradle');
const destDir = join(root, 'apps/web/public/downloads');
const apkDest = join(destDir, 'wab-infos.apk');
const versionDest = join(destDir, 'apk-version.json');

if (!existsSync(apkSrc)) {
  console.error('[copy-apk] APK introuvable. Lancez d’abord : npm run reader-android:release');
  console.error(`           Attendu : ${apkSrc}`);
  process.exit(1);
}

function readGradleVersions() {
  const gradle = readFileSync(buildGradle, 'utf8');
  const versionCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1]);
  const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
  if (!Number.isFinite(versionCode) || !versionName) {
    throw new Error('versionCode / versionName introuvables dans build.gradle');
  }
  return { versionCode, versionName };
}

mkdirSync(destDir, { recursive: true });
copyFileSync(apkSrc, apkDest);

const { versionCode, versionName } = readGradleVersions();
const apkPublicUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL || '/downloads/wab-infos.apk';
const manifest = {
  versionCode,
  versionName,
  apkUrl: apkPublicUrl,
  releasedAt: new Date().toISOString(),
};
writeFileSync(versionDest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const sizeMb = (statSync(apkDest).size / (1024 * 1024)).toFixed(1);
console.log(`[copy-apk] ✅ ${apkDest} (${sizeMb} Mo)`);
console.log(`[copy-apk] ✅ ${versionDest} (v${versionName} / ${versionCode})`);
console.log('[copy-apk] URL publique : /downloads/wab-infos.apk');
