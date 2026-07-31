#!/usr/bin/env node
/**
 * Installe l'APK release sur l'appareil USB (adb).
 * Usage : npm run reader-android:install
 *         npm run reader-android:install:redaction
 */
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const googleServices = join(root, 'apps/reader-android/android/app/google-services.json');
const product = (process.env.READER_ANDROID_PRODUCT || 'reader').trim().toLowerCase();
const pushFlavor =
  product === 'redaction'
    ? 'noFcm'
    : existsSync(googleServices)
      ? 'withFcm'
      : 'noFcm';
const applicationId = product === 'redaction' ? 'com.wabinfos.redaction' : 'com.wabinfos.app';
const siteUrl =
  product === 'redaction' ? 'https://redaction.app.wab-infos.com' : 'https://wab-infos.com';
const flavorCombo = `${product}${pushFlavor.charAt(0).toUpperCase()}${pushFlavor.slice(1)}`;
const apk = join(
  root,
  `apps/reader-android/android/app/build/outputs/apk/${flavorCombo}/release/app-${product}-${pushFlavor}-release.apk`
);

function resolveAdbPath() {
  const adbName = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const sdkRoot =
    process.env.ANDROID_HOME?.trim() ||
    process.env.ANDROID_SDK_ROOT?.trim() ||
    process.env.ANDROID_SDK_HOME?.trim();

  const candidates = [];

  if (sdkRoot) {
    candidates.push(join(sdkRoot, 'platform-tools', adbName));
  }

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA?.trim();
    if (localAppData) {
      candidates.push(join(localAppData, 'Android', 'Sdk', 'platform-tools', adbName));
    }
  } else if (process.platform === 'darwin') {
    candidates.push(join(homedir(), 'Library', 'Android', 'sdk', 'platform-tools', adbName));
  } else {
    candidates.push(join(homedir(), 'Android', 'Sdk', 'platform-tools', adbName));
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return adbName;
}

const adb = resolveAdbPath();

if (!existsSync(apk)) {
  console.error(
    `[install] APK introuvable. Lancez : npm run reader-android:release${product === 'redaction' ? ':redaction' : ''}`
  );
  console.error(apk);
  process.exit(1);
}

const devices = spawnSync(adb, ['devices'], { encoding: 'utf8' });
if (devices.status !== 0) {
  console.error(devices.stderr || devices.stdout);
  process.exit(devices.status ?? 1);
}

const lines = (devices.stdout || '')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('List of devices'));
if (lines.length === 0) {
  console.error('[install] Aucun téléphone détecté. Branchez l’appareil et activez le débogage USB.');
  process.exit(1);
}

console.log(`[install] Appareil : ${lines[0]}`);
console.log(`[install] Product : ${product} / ${pushFlavor}`);
console.log(`[install] APK : ${apk}`);
console.log(`[install] WebView → ${siteUrl}`);

const install = spawnSync(adb, ['install', '-r', apk], { stdio: 'inherit' });
if (install.status !== 0) process.exit(install.status ?? 1);

const version = spawnSync(adb, ['shell', 'dumpsys', 'package', applicationId], {
  encoding: 'utf8',
});
const name = version.stdout?.match(/versionName=([^\s]+)/)?.[1];
const code = version.stdout?.match(/versionCode=(\d+)/)?.[1];
if (name && code) {
  console.log(`[install] ✅ Installé sur le téléphone : v${name} / ${code}`);
} else {
  console.log('[install] ✅ Installation terminée.');
}
