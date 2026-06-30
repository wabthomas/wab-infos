import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { isAllowedOgImagePath } from '@/lib/og-image-url';

const STRAPI_URL = (process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:8090').replace(
  /\/$/,
  ''
);
const WP_UPLOADS_ORIGIN = (
  process.env.WP_UPLOADS_ORIGIN ||
  process.env.WP_BASE_URL ||
  'https://wp.wab-infos.com'
).replace(/\/$/, '');

const CACHE_HEADER = 'public, max-age=31536000, immutable';

function upstreamUrl(path: string): string {
  if (path.startsWith('/wp-content/')) {
    return `${WP_UPLOADS_ORIGIN}${path}`;
  }
  return `${STRAPI_URL}${path}`;
}

/** Convertit WebP/AVIF/etc. en JPEG pour les crawlers sociaux (WhatsApp, Facebook). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get('src')?.trim();

  if (!src || !isAllowedOgImagePath(src)) {
    return NextResponse.json({ error: 'Chemin image invalide' }, { status: 400 });
  }

  try {
    const upstream = await fetch(upstreamUrl(src), {
      next: { revalidate: 86400 },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Image introuvable' }, { status: 404 });
    }

    const input = Buffer.from(await upstream.arrayBuffer());
    const jpeg = await sharp(input, { animated: false })
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(jpeg), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': CACHE_HEADER,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Conversion impossible' }, { status: 500 });
  }
}
