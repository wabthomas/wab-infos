const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif|svg|tiff?)$/i;
const KNOWN_IMAGE_FORMATS = new Set([
  'jpeg',
  'jpg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
  'bmp',
  'avif',
  'svg',
  'tiff',
]);

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default;
  } catch {
    return null;
  }
}

function fallbackFile(file: File): File {
  return file;
}

/** Vérifie qu'un fichier est une image (MIME, extension ou contenu binaire). */
export async function assertUploadableImage(file: File): Promise<void> {
  const mime = file.type.toLowerCase();
  if (mime.startsWith('image/')) {
    return;
  }
  if (mime && mime !== 'application/octet-stream') {
    throw new Error('Image uniquement');
  }

  const sharp = await loadSharp();
  if (!sharp) {
    if (IMAGE_EXT.test(file.name)) {
      return;
    }
    throw new Error('Image uniquement');
  }

  const input = Buffer.from(await file.arrayBuffer());
  try {
    const meta = await sharp(input, { animated: true }).metadata();
    if (!meta.format || !KNOWN_IMAGE_FORMATS.has(meta.format)) {
      throw new Error('Image uniquement');
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'Image uniquement') {
      throw err;
    }
    throw new Error('Image uniquement');
  }
}

/** Compresse et convertit en WebP avant envoi à Strapi (ignore SVG / GIF animés). */
export async function optimizeUploadImage(file: File): Promise<File> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Image trop volumineuse (max 20 Mo)');
  }

  if (file.type === 'image/svg+xml') {
    return file;
  }

  const sharp = await loadSharp();
  if (!sharp) {
    return fallbackFile(file);
  }

  const input = Buffer.from(await file.arrayBuffer());
  let meta: import('sharp').Metadata;
  try {
    meta = await sharp(input, { animated: true }).metadata();
  } catch {
    return fallbackFile(file);
  }
  if (!meta.format) {
    return fallbackFile(file);
  }

  const isAnimated = (meta.pages ?? 1) > 1;
  if (isAnimated || meta.format === 'gif' || meta.format === 'svg') {
    return file;
  }

  try {
    const optimized = await sharp(input)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();

    const baseName = file.name.replace(/\.[^.]+$/i, '') || 'image';
    return new File([new Uint8Array(optimized)], `${baseName}.webp`, {
      type: 'image/webp',
    });
  } catch {
    return fallbackFile(file);
  }
}
