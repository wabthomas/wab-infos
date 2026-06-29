#!/usr/bin/env node
/**
 * Génère les icônes Android à partir du logo circulaire (brand-icon).
 * Usage : npm run reader-android:icons
 */
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRAND_RED = '#C41E3A';
const logoSrc =
  [
    join(root, 'apps/web/public/brand-icon.png'),
    join(root, 'apps/reader-android/assets/app-icon.png'),
    join(root, 'apps/web/public/logo.png'),
  ].find((p) => existsSync(p)) ?? join(root, 'apps/web/public/brand-icon.png');
const assetsDir = join(root, 'apps/reader-android/assets');
const iconDest = join(assetsDir, 'icon.png');

if (!existsSync(logoSrc)) {
  console.error('[icons] Logo introuvable :', logoSrc);
  process.exit(1);
}

mkdirSync(assetsDir, { recursive: true });
copyFileSync(logoSrc, iconDest);
console.log('[icons] Copié →', iconDest);

const result = spawnSync(
  'npx',
  [
    '@capacitor/assets',
    'generate',
    '--android',
    '--iconBackgroundColor',
    BRAND_RED,
    '--splashBackgroundColor',
    BRAND_RED,
  ],
  {
    cwd: join(root, 'apps/reader-android'),
    stdio: 'inherit',
    shell: true,
  }
);

if (result.status !== 0) {
  console.error('[icons] Échec @capacitor/assets — exécutez : npm install --workspace=apps/reader-android');
  process.exit(result.status ?? 1);
}

console.log('[icons] Icônes Android générées. Puis : npm run reader-android:sync');
