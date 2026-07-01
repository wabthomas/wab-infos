#!/usr/bin/env node
/**
 * Installe l'APK release sur l'appareil USB (adb).
 * Usage : npm run reader-android:install
 */
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apk = join(
  root,
  'apps/reader-android/android/app/build/outputs/apk/release/app-release.apk'
);

const adb =
  process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
    ? join(
        (process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT).replace(/\\/g, '/'),
        'platform-tools/adb.exe'
      )
    : 'C:/Users/wabth/AppData/Local/Android/Sdk/platform-tools/adb.exe';

if (!existsSync(apk)) {
  console.error('[install] APK introuvable. Lancez : npm run reader-android:release');
  console.error(apk);
  process.exit(1);
}

const capConfigPath = join(
  root,
  'apps/reader-android/android/app/src/main/assets/capacitor.config.json'
);
if (existsSync(capConfigPath)) {
  try {
    const capConfig = JSON.parse(readFileSync(capConfigPath, 'utf8'));
    if (!capConfig.server?.url) {
      console.warn(
        '[install] ⚠️  APK sans server.url (page locale). Rebuild : npm run reader-android:release'
      );
    } else {
      console.log(`[install] WebView → ${capConfig.server.url}`);
    }
  } catch {
    // ignore
  }
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
console.log(`[install] APK : ${apk}`);

const install = spawnSync(adb, ['install', '-r', apk], { stdio: 'inherit' });
if (install.status !== 0) process.exit(install.status ?? 1);

const version = spawnSync(
  adb,
  ['shell', 'dumpsys', 'package', 'com.wabinfos.app'],
  { encoding: 'utf8' }
);
const name = version.stdout?.match(/versionName=([^\s]+)/)?.[1];
const code = version.stdout?.match(/versionCode=(\d+)/)?.[1];
if (name && code) {
  console.log(`[install] ✅ Installé sur le téléphone : v${name} / ${code}`);
} else {
  console.log('[install] ✅ Installation terminée.');
}
