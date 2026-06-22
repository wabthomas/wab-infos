/**
 * Génère favicon + icônes PWA à partir de public/logo.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const source = path.join(root, 'public/logo.png');
const iconsDir = path.join(root, 'public/icons');
const appDir = path.join(root, 'src/app');

if (!fs.existsSync(source)) {
  console.error('❌ public/logo.png introuvable');
  process.exit(1);
}

fs.mkdirSync(iconsDir, { recursive: true });

const BRAND = '#c41e3a';
const WHITE = { r: 255, g: 255, b: 255, alpha: 255 };

/** Logo plus grand + fond blanc (remplit le masque circulaire iOS / Android). */
async function squareIcon(size, { maskable = false } = {}) {
  const fillRatio = maskable ? 0.9 : 0.92;
  const inner = Math.round(size * fillRatio);
  const pad = Math.round((size - inner) / 2);

  return sharp(source)
    .resize(inner, inner, {
      fit: 'contain',
      background: WHITE,
    })
    .extend({
      top: pad,
      bottom: size - inner - pad,
      left: pad,
      right: size - inner - pad,
      background: WHITE,
    })
    .png()
    .toBuffer();
}

async function writePng(target, buffer) {
  await fs.promises.writeFile(target, buffer);
  console.log(`✓ ${path.relative(root, target)}`);
}

// PWA / manifest
for (const size of [192, 512]) {
  await writePng(path.join(iconsDir, `icon-${size}.png`), await squareIcon(size));
  await writePng(
    path.join(iconsDir, `icon-${size}-maskable.png`),
    await squareIcon(size, { maskable: true })
  );
}

// Next.js App Router (favicon automatique)
for (const [name, size] of [
  ['icon.png', 32],
  ['apple-icon.png', 180],
]) {
  await writePng(path.join(appDir, name), await squareIcon(size));
}

// favicon.ico (16 + 32 + 48)
const icoSizes = [16, 32, 48];
const pngParts = await Promise.all(icoSizes.map((s) => squareIcon(s)));
await writePng(path.join(iconsDir, 'favicon-48.png'), pngParts[2]);

// ICO minimal : en-tête + entrées PNG embarquées (format Windows ICO avec PNG)
const ico = buildIco(pngParts, icoSizes);
await fs.promises.writeFile(path.join(root, 'public/favicon.ico'), ico);
console.log('✓ public/favicon.ico');

// SVG simplifié (globe + anneau — reprend les couleurs de la marque)
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="Wab-infos">
  <rect width="512" height="512" rx="96" fill="${BRAND}"/>
  <circle cx="256" cy="220" r="118" fill="#1d4f8f" stroke="#0f3460" stroke-width="14"/>
  <ellipse cx="256" cy="220" rx="118" ry="118" fill="url(#g)"/>
  <defs>
    <radialGradient id="g" cx="40%" cy="35%">
      <stop offset="0%" stop-color="#7ec8e3"/>
      <stop offset="100%" stop-color="#1d4f8f"/>
    </radialGradient>
  </defs>
  <circle cx="256" cy="220" r="100" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.35"/>
  <circle cx="330" cy="155" r="18" fill="#5ec8e8"/>
  <circle cx="185" cy="290" r="18" fill="#e91e8c"/>
  <text x="256" y="420" font-family="Oswald,Arial Narrow,sans-serif" font-size="72" font-weight="700" fill="#ffffff" text-anchor="middle">Wab-infos</text>
</svg>`;

for (const size of [192, 512]) {
  const target = path.join(iconsDir, `icon-${size}.svg`);
  await fs.promises.writeFile(target, svg.replace('width="512" height="512"', `width="${size}" height="${size}"`));
  console.log(`✓ ${path.relative(root, target)}`);
}

console.log('\nIcônes générées depuis public/logo.png');

/** ICO avec images PNG (Windows Vista+) */
function buildIco(images, sizes) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntrySize = 16;
  const dir = Buffer.alloc(dirEntrySize * count);
  let offset = 6 + dirEntrySize * count;
  const chunks = [header, dir];

  for (let i = 0; i < count; i++) {
    const img = images[i];
    const s = sizes[i];
    const entry = i * dirEntrySize;
    dir.writeUInt8(s >= 256 ? 0 : s, entry);
    dir.writeUInt8(s >= 256 ? 0 : s, entry + 1);
    dir.writeUInt8(0, entry + 2);
    dir.writeUInt8(0, entry + 3);
    dir.writeUInt16LE(1, entry + 4);
    dir.writeUInt16LE(32, entry + 6);
    dir.writeUInt32LE(img.length, entry + 8);
    dir.writeUInt32LE(offset, entry + 12);
    chunks.push(img);
    offset += img.length;
  }

  return Buffer.concat(chunks);
}
