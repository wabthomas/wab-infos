/**
 * Génère public/publisher-logo.png (400×200) pour Google News Publisher Center + JSON-LD.
 * Publisher Center : PNG, largeur reco. 400 px (min. 200), ratio ≤ 10:1.
 * Usage : node scripts/generate-publisher-logo.mjs [chemin-source-optionnel]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const webPublic = path.join(root, 'apps/web/public');
const defaultSource = path.join(webPublic, 'publisher-logo-source.png');
const outPath = path.join(webPublic, 'publisher-logo.png');

const WIDTH = 400;
const HEIGHT = 200;

async function main() {
  const sourceArg = process.argv[2];
  const sourcePath = sourceArg
    ? path.resolve(sourceArg)
    : fs.existsSync(defaultSource)
      ? defaultSource
      : null;

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    console.error(
      'Source introuvable. Placez le logo dans apps/web/public/publisher-logo-source.png ou passez le chemin en argument.'
    );
    process.exit(1);
  }

  const metaIn = await sharp(sourcePath).metadata();
  if (metaIn.width === WIDTH && metaIn.height === HEIGHT) {
    await fs.promises.copyFile(sourcePath, outPath);
  } else {
    const trimmed = await sharp(sourcePath)
      .trim({ threshold: 12 })
      .png()
      .toBuffer();

    await sharp(trimmed)
      .resize(WIDTH, HEIGHT, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
  }

  const meta = await sharp(outPath).metadata();
  console.info(`[publisher-logo] ${outPath} (${meta.width}×${meta.height}) depuis ${sourcePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
