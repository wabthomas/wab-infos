import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/icons');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#c41e3a"/>
  <text x="256" y="320" font-family="Arial,sans-serif" font-size="280" font-weight="bold" fill="#ffffff" text-anchor="middle">W</text>
</svg>`;

fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const target = path.join(outDir, `icon-${size}.png`);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(target);
  console.log(`Wrote ${target}`);
}
