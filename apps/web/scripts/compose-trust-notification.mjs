import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

/** Soft white rounded-square plate behind the mark. */
async function roundedPlate(size, radius, opacity = 0.98) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect x="2" y="2" width="${size - 4}" height="${size - 4}"
        rx="${radius}" ry="${radius}"
        fill="rgba(255,255,255,${opacity})" filter="url(#soft)"/>
    </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Square logo (favicon style) with border-radius mask. */
async function roundedSquareMark(srcPath, targetWidth, radius) {
  const resized = await sharp(srcPath)
    .ensureAlpha()
    .resize({ width: targetWidth, height: targetWidth, fit: 'cover' })
    .png()
    .toBuffer();

  const maskSvg = `
    <svg width="${targetWidth}" height="${targetWidth}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${targetWidth}" height="${targetWidth}"
        rx="${radius}" ry="${radius}" fill="#fff"/>
    </svg>`;

  return sharp(resized)
    .composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
    .png()
    .toBuffer();
}

/** Title + slogan under the logo, with a frosted dark plate for contrast. */
async function brandText(canvasSize, textTopY) {
  const title = 'Wab-infos';
  const slogan = "s'informer pour mieux s'armer!";
  const titleY = textTopY + 42;
  const sloganY = textTopY + 78;
  const boxW = 520;
  const boxH = 108;
  const boxX = (canvasSize - boxW) / 2;
  const boxY = textTopY + 4;
  const svg = `
    <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="plateShadow" x="-15%" y="-25%" width="130%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000" flood-opacity="0.35"/>
        </filter>
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.45"/>
        </filter>
      </defs>
      <rect
        x="${boxX}" y="${boxY}"
        width="${boxW}" height="${boxH}"
        rx="18" ry="18"
        fill="rgba(8, 18, 36, 0.72)"
        filter="url(#plateShadow)"
      />
      <text
        x="50%" y="${titleY}"
        text-anchor="middle"
        font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="44"
        font-weight="700"
        fill="#ffffff"
        letter-spacing="0.4"
        filter="url(#textShadow)"
      >${title}</text>
      <text
        x="50%" y="${sloganY}"
        text-anchor="middle"
        font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="24"
        font-weight="500"
        fill="#e8eef5"
        letter-spacing="0.15"
        filter="url(#textShadow)"
      >${slogan}</text>
    </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  const size = 1200;
  const basePath =
    'C:/Users/wabth/.cursor/projects/c-laragon-www-wab-infos/assets/trust-world-base.png';
  // Favicon-style square (circular mark on black) — higher-res brand-icon
  const iconPath = path.join(root, 'public', 'brand-icon.png');
  const outJpg = path.join(root, 'public', 'notifications', 'trust-world.jpg');
  const outPng = path.join(root, 'public', 'notifications', 'trust-world.png');
  const markOut = path.join(root, 'public', 'notifications', 'logo-mark-square.png');

  const base = await sharp(basePath).resize(size, size).png().toBuffer();

  const plateSize = 180;
  const logoSize = 154;
  // ~22% radius ≈ iOS-style rounded square
  const radius = Math.round(logoSize * 0.22);
  const plateRadius = Math.round(plateSize * 0.22);

  const plate = await roundedPlate(plateSize, plateRadius, 0.98);
  const logo = await roundedSquareMark(iconPath, logoSize, radius);
  await sharp(logo).toFile(markOut);

  const logoMeta = await sharp(logo).metadata();
  const lw = logoMeta.width ?? logoSize;
  const lh = logoMeta.height ?? logoSize;

  const plateLeft = Math.round((size - plateSize) / 2);
  const plateTop = Math.round(size * 0.34 - plateSize / 2);
  const logoLeft = plateLeft + Math.round((plateSize - lw) / 2);
  const logoTop = plateTop + Math.round((plateSize - lh) / 2);
  const text = await brandText(size, plateTop + plateSize + 8);

  const composed = await sharp(base)
    .composite([
      { input: plate, left: plateLeft, top: plateTop },
      { input: logo, left: logoLeft, top: logoTop },
      { input: text, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();

  await sharp(composed).png().toFile(outPng);
  await sharp(composed).jpeg({ quality: 90, mozjpeg: true }).toFile(outJpg);

  console.log('OK', { plateSize, logo: `${lw}x${lh}`, radius, plateTop });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
