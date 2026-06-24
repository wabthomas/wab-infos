/**
 * Génère favicon + icônes PWA à partir de public/brand-icon.png
 * (icône circulaire globe — distincte du logo texte public/logo.png)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const source = path.join(root, 'public/brand-icon.png');
const iconsDir = path.join(root, 'public/icons');
const appDir = path.join(root, 'src/app');

if (!fs.existsSync(source)) {
  console.error('❌ public/brand-icon.png introuvable');
  process.exit(1);
}

fs.mkdirSync(iconsDir, { recursive: true });

const WHITE = { r: 255, g: 255, b: 255, alpha: 255 };

/** Icône carrée : pleine taille ou zone sûre maskable Android (80 %). */
async function squareIcon(size, { maskable = false } = {}) {
  const fillRatio = maskable ? 0.8 : 1;
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

console.log('\nIcônes générées depuis public/brand-icon.png');

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
