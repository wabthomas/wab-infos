#!/usr/bin/env node
/**
 * Copie l'APK release vers apps/web/public/downloads/ pour le téléchargement visiteurs.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apkSrc = join(
  root,
  'apps/reader-android/android/app/build/outputs/apk/release/app-release.apk'
);
const destDir = join(root, 'apps/web/public/downloads');
const apkDest = join(destDir, 'wab-infos.apk');

if (!existsSync(apkSrc)) {
  console.error('[copy-apk] APK introuvable. Lancez d’abord : npm run reader-android:release');
  console.error(`           Attendu : ${apkSrc}`);
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(apkSrc, apkDest);

const sizeMb = (statSync(apkDest).size / (1024 * 1024)).toFixed(1);
console.log(`[copy-apk] ✅ ${apkDest} (${sizeMb} Mo)`);
console.log('[copy-apk] URL publique : /downloads/wab-infos.apk');
