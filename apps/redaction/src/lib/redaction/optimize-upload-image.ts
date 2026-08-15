const MAX_WIDTH = 1920;
const JPEG_QUALITY = 82;
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

/** Nom ASCII + extension — évite « Fil is not a valid image » (nom tronqué / sans extension). */
export function safeImageFilename(originalName: string, ext: string): string {
  const base = (originalName || 'image').replace(/\.[^.]+$/i, '');
  const slug =
    base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image';
  const cleanExt = ext.replace(/^\./, '').toLowerCase() || 'jpg';
  return `${slug}.${cleanExt}`;
}

function extFromMime(mime: string): string {
  const type = mime.toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('gif')) return 'gif';
  if (type.includes('svg')) return 'svg';
  if (type.includes('webp')) return 'webp';
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  return 'jpg';
}

function withSafeName(file: File, ext?: string): File {
  const name = safeImageFilename(file.name, ext || extFromMime(file.type) || 'jpg');
  if (name === file.name) return file;
  return new File([file], name, { type: file.type || 'application/octet-stream' });
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
    const meta = await sharp(input, { failOn: 'none', animated: true }).metadata();
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

/**
 * Réencode en JPEG/PNG propre avant Strapi.
 * Les JPEG Samsung / HEIC / WebP bruts font échouer `isFaultyImage` (« File is not a valid image »).
 */
export async function optimizeUploadImage(file: File): Promise<File> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Image trop volumineuse (max 20 Mo)');
  }

  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    return withSafeName(file, 'svg');
  }

  const sharp = await loadSharp();
  if (!sharp) {
    return withSafeName(file);
  }

  const input = Buffer.from(await file.arrayBuffer());
  let meta: import('sharp').Metadata;
  try {
    meta = await sharp(input, { failOn: 'none', animated: true }).metadata();
  } catch {
    throw new Error(
      'Cette image n’est pas lisible (HEIC, JPEG corrompu…). Enregistrez-la en JPEG ou PNG.'
    );
  }
  if (!meta.format) {
    throw new Error(
      'Cette image n’est pas lisible (HEIC, JPEG corrompu…). Enregistrez-la en JPEG ou PNG.'
    );
  }

  const isAnimated = (meta.pages ?? 1) > 1;
  if (isAnimated || meta.format === 'gif') {
    return withSafeName(file, 'gif');
  }
  if (meta.format === 'svg') {
    return withSafeName(file, 'svg');
  }

  const quality =
    input.length > 2 * 1024 * 1024
      ? 72
      : input.length > 1024 * 1024
        ? 75
        : input.length > 500 * 1024
          ? 78
          : JPEG_QUALITY;

  try {
    const pipeline = sharp(input, { failOn: 'none' })
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true });

    if (meta.hasAlpha) {
      const optimized = await pipeline.png({ compressionLevel: 8 }).toBuffer();
      return new File([new Uint8Array(optimized)], safeImageFilename(file.name, 'png'), {
        type: 'image/png',
      });
    }

    const optimized = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    return new File([new Uint8Array(optimized)], safeImageFilename(file.name, 'jpg'), {
      type: 'image/jpeg',
    });
  } catch {
    throw new Error(
      'Impossible de préparer cette image pour le CMS. Enregistrez-la en JPEG ou PNG.'
    );
  }
}
