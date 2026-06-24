/**
 * Injecte public/offline.html et redaction-offline.html dans les constantes OFFLINE_HTML des SW.
 * Exécuter après modification des pages hors ligne : npm run pwa:offline --workspace=apps/web
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const PAIRS = [
  { html: 'offline.html', sw: 'sw.js' },
  { html: 'redaction-offline.html', sw: 'sw-redaction.js' },
];

function minifyHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*/g, '')
    .replace(/>\s+</g, '><')
    .trim();
}

function injectOfflineHtml(swPath, html) {
  const source = fs.readFileSync(swPath, 'utf8');
  const minified = minifyHtml(html);
  const pattern = /(const OFFLINE_HTML = `)[\s\S]*?(`;)/;
  if (!pattern.test(source)) {
    throw new Error(`OFFLINE_HTML introuvable dans ${path.basename(swPath)}`);
  }
  const next = source.replace(pattern, (_match, open, close) => `${open}${minified}${close}`);
  if (next === source) {
    console.info(`  → ${path.basename(swPath)} déjà à jour`);
    return;
  }
  fs.writeFileSync(swPath, next, 'utf8');
  console.info(`  ✓ ${path.basename(swPath)} (${(minified.length / 1024).toFixed(1)} Ko)`);
}

for (const { html, sw } of PAIRS) {
  const htmlPath = path.join(publicDir, html);
  const swPath = path.join(publicDir, sw);
  injectOfflineHtml(swPath, fs.readFileSync(htmlPath, 'utf8'));
}

console.info('✓ Fallbacks OFFLINE_HTML synchronisés');
