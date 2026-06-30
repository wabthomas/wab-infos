#!/usr/bin/env node
/**
 * Génère les splash Android natifs (même rendu que le lanceur web PWA).
 * Usage : node scripts/reader-android-splash.mjs
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const sharp = require(join(root, 'node_modules/sharp'));

const SITE_NAME = 'Wab-infos';
const TAGLINE = "S'informer pour mieux s'armer !";
const brandIcon = join(root, 'apps/web/public/brand-icon.png');
const resDir = join(root, 'apps/reader-android/android/app/src/main/res');

const PNG_OPTS = { compressionLevel: 9, effort: 7 };

const SPLASH_FOLDERS = {
  drawable: { width: 320, height: 480 },
  'drawable-port-ldpi': { width: 240, height: 320 },
  'drawable-port-mdpi': { width: 320, height: 480 },
  'drawable-port-hdpi': { width: 480, height: 800 },
  'drawable-port-xhdpi': { width: 720, height: 1280 },
  'drawable-port-xxhdpi': { width: 960, height: 1600 },
  'drawable-port-xxxhdpi': { width: 1280, height: 1920 },
  'drawable-land-ldpi': { width: 320, height: 240 },
  'drawable-land-mdpi': { width: 480, height: 320 },
  'drawable-land-hdpi': { width: 800, height: 480 },
  'drawable-land-xhdpi': { width: 1280, height: 720 },
  'drawable-land-xxhdpi': { width: 1600, height: 960 },
  'drawable-land-xxxhdpi': { width: 1920, height: 1280 },
};

function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

async function toPng(buffer) {
  return sharp(buffer).png(PNG_OPTS).toBuffer();
}

async function gradientBuffer(width, height) {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#c41e3a"/>
        <stop offset="50%" stop-color="#8b1538"/>
        <stop offset="100%" stop-color="#1d3557"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  return toPng(Buffer.from(svg));
}

async function logoBuffer(size) {
  const ring = Math.max(2, Math.round(size * 0.035));
  const inner = size - ring * 2;

  const circleMask = Buffer.from(
    `<svg width="${inner}" height="${inner}"><circle cx="${inner / 2}" cy="${inner / 2}" r="${inner / 2}" fill="#fff"/></svg>`
  );

  const circularLogo = await sharp(brandIcon)
    .resize(inner, inner, { fit: 'cover', position: 'centre' })
    .png(PNG_OPTS)
    .composite([{ input: await sharp(circleMask).png().toBuffer(), blend: 'dest-in' }])
    .png(PNG_OPTS)
    .toBuffer();

  const ringSvg = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${(inner - ring) / 2}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="${ring}"/></svg>`
  );

  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: circularLogo, top: ring, left: ring },
      { input: await sharp(ringSvg).png().toBuffer(), top: 0, left: 0 },
    ])
    .png(PNG_OPTS)
    .toBuffer();
}

async function copyBlockBuffer(width) {
  const titleSize = Math.max(16, Math.round(width * 0.052));
  const sloganSize = Math.max(10, Math.round(width * 0.032));
  const gap = Math.round(titleSize * 0.45);
  const height = titleSize + gap + Math.round(sloganSize * 1.6);
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="50%" y="${titleSize}" dominant-baseline="auto" text-anchor="middle"
      fill="#ffffff" font-family="Roboto,Arial,sans-serif"
      font-size="${titleSize}" font-weight="700" letter-spacing="-0.5">${escapeXml(SITE_NAME)}</text>
    <text x="50%" y="${titleSize + gap + sloganSize}" dominant-baseline="auto" text-anchor="middle"
      fill="rgba(255,255,255,0.9)" font-family="Roboto,Arial,sans-serif"
      font-size="${sloganSize}" font-weight="500">${escapeXml(TAGLINE)}</text>
  </svg>`;
  return toPng(Buffer.from(svg));
}

async function fullSplash(width, height) {
  const isLandscape = width > height;
  const logoSize = Math.round(
    Math.min(isLandscape ? height * 0.26 : width * 0.28, isLandscape ? height * 0.3 : 104)
  );
  const logo = await logoBuffer(logoSize);
  const copy = await copyBlockBuffer(Math.min(width, Math.round(width * 0.86)));
  const copyMeta = await sharp(copy).metadata();

  const blockHeight = (copyMeta.height ?? 0) + logoSize;
  const logoTop = Math.round(height * 0.38 - blockHeight / 2);
  const copyTop = logoTop + logoSize + Math.round(height * 0.028);
  const copyLeft = Math.round((width - (copyMeta.width ?? width)) / 2);

  return sharp(await gradientBuffer(width, height))
    .composite([
      { input: logo, top: Math.max(0, logoTop), left: Math.round((width - logoSize) / 2) },
      { input: copy, top: copyTop, left: Math.max(0, copyLeft) },
    ])
    .png(PNG_OPTS)
    .toBuffer();
}

async function splashIcon(size = 384) {
  return logoBuffer(Math.round(size * 0.68));
}

async function writePng(folder, name, buffer) {
  const dir = join(resDir, folder);
  mkdirSync(dir, { recursive: true });
  const target = join(dir, `${name}.png`);
  await sharp(buffer).png(PNG_OPTS).toFile(target);
  return target;
}

async function main() {
  if (!existsSync(brandIcon)) {
    console.error('[splash] brand-icon.png introuvable');
    process.exit(1);
  }

  mkdirSync(join(resDir, 'drawable'), { recursive: true });

  writeFileSync(
    join(resDir, 'drawable/splash_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient
        android:type="linear"
        android:angle="135"
        android:startColor="#c41e3a"
        android:centerColor="#8b1538"
        android:endColor="#1d3557" />
</shape>
`,
    'utf8'
  );

  const icon = await splashIcon(384);
  const branding = await copyBlockBuffer(960);

  await writePng('drawable-nodpi', 'splash_icon', icon);
  await writePng('drawable-nodpi', 'splash_branding', branding);

  for (const [folder, { width, height }] of Object.entries(SPLASH_FOLDERS)) {
    const png = await fullSplash(width, height);
    const path = await writePng(folder, 'splash', png);
    console.log('[splash]', path.replace(root + '\\', '').replace(root + '/', ''));
  }

  const nightMap = {
    'drawable-night': 'drawable',
    'drawable-port-night-ldpi': 'drawable-port-ldpi',
    'drawable-port-night-mdpi': 'drawable-port-mdpi',
    'drawable-port-night-hdpi': 'drawable-port-hdpi',
    'drawable-port-night-xhdpi': 'drawable-port-xhdpi',
    'drawable-port-night-xxhdpi': 'drawable-port-xxhdpi',
    'drawable-port-night-xxxhdpi': 'drawable-port-xxxhdpi',
    'drawable-land-night-ldpi': 'drawable-land-ldpi',
    'drawable-land-night-mdpi': 'drawable-land-mdpi',
    'drawable-land-night-hdpi': 'drawable-land-hdpi',
    'drawable-land-night-xhdpi': 'drawable-land-xhdpi',
    'drawable-land-night-xxhdpi': 'drawable-land-xxhdpi',
    'drawable-land-night-xxxhdpi': 'drawable-land-xxxhdpi',
  };

  for (const [nightFolder, dayFolder] of Object.entries(nightMap)) {
    const src = join(resDir, dayFolder, 'splash.png');
    const destDir = join(resDir, nightFolder);
    mkdirSync(destDir, { recursive: true });
    const dest = join(destDir, 'splash.png');
    writeFileSync(dest, await sharp(src).png(PNG_OPTS).toBuffer());
  }

  console.log('[splash] Wab-infos + slogan, logo réduit, PNG optimisés');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
