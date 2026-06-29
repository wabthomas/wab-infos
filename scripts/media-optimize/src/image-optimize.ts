import sharp from 'sharp';

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 82;
const PNG_COMPRESSION = 9;

export type OptimizeResult =
  | { skipped: true; reason: string; buffer: Buffer }
  | { skipped: false; buffer: Buffer; mime: string };

/** Recompresse en conservant le format (Strapi replace garde hash + extension). */
export async function optimizeImageBuffer(
  input: Buffer,
  mime: string
): Promise<OptimizeResult> {
  const meta = await sharp(input, { animated: true }).metadata();
  const isAnimated = (meta.pages ?? 1) > 1;

  if (mime === 'image/svg+xml' || meta.format === 'svg') {
    return { skipped: true, reason: 'svg', buffer: input };
  }
  if (isAnimated || meta.format === 'gif') {
    return { skipped: true, reason: 'gif', buffer: input };
  }
  if (!mime.startsWith('image/')) {
    return { skipped: true, reason: 'not-image', buffer: input };
  }

  const pipeline = sharp(input).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });

  if (mime === 'image/png' || meta.format === 'png') {
    const buffer = await pipeline.png({ compressionLevel: PNG_COMPRESSION, effort: 7 }).toBuffer();
    return { skipped: false, buffer, mime: 'image/png' };
  }

  if (mime === 'image/webp' || meta.format === 'webp') {
    const buffer = await pipeline.webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer();
    return { skipped: false, buffer, mime: 'image/webp' };
  }

  const buffer = await pipeline
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  return { skipped: false, buffer, mime: 'image/jpeg' };
}
