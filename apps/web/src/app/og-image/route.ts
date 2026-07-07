import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { siteConfig } from '@/config/site';
import { isAllowedOgImagePath } from '@/lib/og-image-url';

const SITE_ORIGIN = siteConfig.url.replace(/\/$/, '');
const WP_UPLOADS_ORIGIN = (
  process.env.WP_UPLOADS_ORIGIN ||
  process.env.WP_BASE_URL ||
  'https://wp.wab-infos.com'
).replace(/\/$/, '');
const STRAPI_URL = (
  process.env.STRAPI_URL ||
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  'https://cms.app.wab-infos.com'
).replace(/\/$/, '');

const CACHE_HEADER = 'public, max-age=31536000, immutable';
const JPEG_EXT = /\.jpe?g$/i;
const PNG_EXT = /\.png$/i;
const WEBP_EXT = /\.webp$/i;

function upstreamCandidates(path: string): string[] {
  const urls = [`${SITE_ORIGIN}${path}`];
  if (path.startsWith('/wp-content/')) {
    urls.push(`${WP_UPLOADS_ORIGIN}${path}`);
  } else {
    urls.push(`${STRAPI_URL}${path}`);
  }
  return urls;
}

async function fetchUpstream(path: string): Promise<Response | null> {
  for (const url of upstreamCandidates(path)) {
    try {
      const response = await fetch(url, { next: { revalidate: 86400 } });
      if (response.ok) return response;
    } catch {
      // essai suivant
    }
  }
  return null;
}

function responseHeaders(contentType: string, extra?: Record<string, string>): HeadersInit {
  return {
    'Content-Type': contentType,
    'Cache-Control': CACHE_HEADER,
    'Content-Disposition': 'inline',
    ...extra,
  };
}

/** Convertit WebP/AVIF/etc. en JPEG pour les crawlers sociaux (WhatsApp, Facebook). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get('src')?.trim();

  if (!src || !isAllowedOgImagePath(src)) {
    return NextResponse.json({ error: 'Chemin image invalide' }, { status: 400 });
  }

  const upstream = await fetchUpstream(src);
  if (!upstream) {
    return NextResponse.json({ error: 'Image introuvable' }, { status: 404 });
  }

  const input = Buffer.from(await upstream.arrayBuffer());
  const upstreamType = upstream.headers.get('content-type') ?? '';

  if (JPEG_EXT.test(src) || upstreamType.includes('jpeg')) {
    return new NextResponse(new Uint8Array(input), {
      status: 200,
      headers: responseHeaders('image/jpeg', { 'Content-Disposition': 'inline; filename="share.jpg"' }),
    });
  }

  if (PNG_EXT.test(src) || upstreamType.includes('png')) {
    return new NextResponse(new Uint8Array(input), {
      status: 200,
      headers: responseHeaders('image/png', { 'Content-Disposition': 'inline; filename="share.png"' }),
    });
  }

  try {
    const jpeg = await sharp(input, { animated: false, failOn: 'none' })
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(jpeg), {
      status: 200,
      headers: responseHeaders('image/jpeg', { 'Content-Disposition': 'inline; filename="og-image.jpg"' }),
    });
  } catch {
    if (WEBP_EXT.test(src)) {
      return NextResponse.redirect(`${SITE_ORIGIN}${src}`, 302);
    }

    try {
      const fallback = await fetch(`${SITE_ORIGIN}/opengraph-image.png`, {
        next: { revalidate: 86400 },
      });
      if (fallback.ok) {
        const png = Buffer.from(await fallback.arrayBuffer());
        return new NextResponse(new Uint8Array(png), {
          status: 200,
          headers: responseHeaders('image/png'),
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ error: 'Conversion impossible' }, { status: 500 });
  }
}
