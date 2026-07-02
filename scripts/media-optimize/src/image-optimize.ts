import sharp from 'sharp';

export const MAX_WIDTH = 1920;
const WEBP_QUALITY_DEFAULT = 82;
const JPEG_QUALITY = 82;
const PNG_COMPRESSION = 9;

const WEBP_CONVERTIBLE = new Set(['jpeg', 'jpg', 'png', 'bmp', 'tiff', 'heif', 'heic', 'avif']);

export type OptimizeOptions = {
  /** Convertit JPEG/PNG/etc. en WebP (défaut: true). */
  webp?: boolean;
};

export type OptimizeResult =
  | { skipped: true; reason: string; buffer: Buffer }
  | { skipped: false; buffer: Buffer; mime: string; filename: string };

function webpQualityForBytes(bytes: number): number {
  if (bytes > 2 * 1024 * 1024) return 72;
  if (bytes > 1024 * 1024) return 75;
  if (bytes > 500 * 1024) return 78;
  return WEBP_QUALITY_DEFAULT;
}

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/i, '') || 'image';
}

function outputFilename(originalName: string, mime: string): string {
  const base = baseName(originalName);
  if (mime === 'image/webp') return `${base}.webp`;
  if (mime === 'image/png') return `${base}.png`;
  if (mime === 'image/jpeg') return `${base}.jpg`;
  return originalName;
}

/** Recompresse et convertit en WebP les images raster (sauf SVG / GIF animés). */
export async function optimizeImageBuffer(
  input: Buffer,
  mime: string,
  originalName: string,
  options: OptimizeOptions = {}
): Promise<OptimizeResult> {
  const convertToWebp = options.webp !== false;
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
  const format = meta.format ?? mime.replace('image/', '');

  if (convertToWebp && format !== 'webp' && WEBP_CONVERTIBLE.has(format)) {
    const quality = webpQualityForBytes(input.length);
    const buffer = await pipeline.webp({ quality, effort: 4 }).toBuffer();
    return {
      skipped: false,
      buffer,
      mime: 'image/webp',
      filename: outputFilename(originalName, 'image/webp'),
    };
  }

  if (mime === 'image/webp' || format === 'webp') {
    const quality = webpQualityForBytes(input.length);
    const buffer = await pipeline.webp({ quality, effort: 4 }).toBuffer();
    return {
      skipped: false,
      buffer,
      mime: 'image/webp',
      filename: outputFilename(originalName, 'image/webp'),
    };
  }

  if (mime === 'image/png' || format === 'png') {
    const buffer = await pipeline.png({ compressionLevel: PNG_COMPRESSION, effort: 7 }).toBuffer();
    return {
      skipped: false,
      buffer,
      mime: 'image/png',
      filename: outputFilename(originalName, 'image/png'),
    };
  }

  const buffer = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
  return {
    skipped: false,
    buffer,
    mime: 'image/jpeg',
    filename: outputFilename(originalName, 'image/jpeg'),
  };
}
