import sharp from 'sharp';

const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

/** Compresse et convertit en WebP avant envoi à Strapi (ignore SVG / GIF animés). */
export async function optimizeUploadImage(file: File): Promise<File> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Image trop volumineuse (max 20 Mo)');
  }

  if (file.type === 'image/svg+xml') {
    return file;
  }

  const input = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(input, { animated: true }).metadata();
  const isAnimated = (meta.pages ?? 1) > 1;

  if (isAnimated || meta.format === 'gif') {
    return file;
  }

  const optimized = await sharp(input)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();

  const baseName = file.name.replace(/\.[^.]+$/i, '') || 'image';
  return new File([new Uint8Array(optimized)], `${baseName}.webp`, {
    type: 'image/webp',
  });
}
