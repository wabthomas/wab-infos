/**
 * Image Open Graph statique (évite ImageResponse / Satori au build — EAGAIN CloudLinux).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, '..', 'src', 'app');

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Wab-infos';
const description =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
  "Actualités RDC, politique, économie, sports et international. Wab-infos, votre source d'information fiable.";

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c0c0f"/>
      <stop offset="55%" stop-color="#1d3557"/>
      <stop offset="100%" stop-color="#c41e3a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="64" y="64" width="12" height="48" rx="4" fill="#c41e3a"/>
  <text x="92" y="98" fill="rgba(255,255,255,0.75)" font-family="system-ui, sans-serif" font-size="28" font-weight="700" letter-spacing="2">
    ACTUALITÉS RDC &amp; INTERNATIONAL
  </text>
  <text x="64" y="420" fill="#ffffff" font-family="system-ui, sans-serif" font-size="88" font-weight="800">
    ${escapeXml(siteName)}
  </text>
  <text x="64" y="490" fill="rgba(255,255,255,0.85)" font-family="system-ui, sans-serif" font-size="32" font-weight="400">
    ${escapeXml(truncate(description, 72))}
  </text>
  <text x="64" y="580" fill="rgba(255,255,255,0.65)" font-family="system-ui, sans-serif" font-size="24" font-weight="400">
    wab-infos.com
  </text>
  <text x="1136" y="580" fill="rgba(255,255,255,0.65)" font-family="system-ui, sans-serif" font-size="24" font-weight="400" text-anchor="end">
    Information fiable en continu
  </text>
</svg>`;

const pngPath = path.join(appDir, 'opengraph-image.png');
const altPath = path.join(appDir, 'opengraph-image.alt.txt');

await sharp(Buffer.from(svg)).png().toFile(pngPath);
await fs.promises.writeFile(
  altPath,
  `${siteName} — Actualités RDC et International`,
  'utf8'
);

console.log(`✓ ${path.relative(path.join(__dirname, '..'), pngPath)}`);
console.log(`✓ ${path.relative(path.join(__dirname, '..'), altPath)}`);
