import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 86400;

const ID_RE = /^[\w-]{6,20}$/;

const SOURCES = (id: string) => [
  `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
];

/**
 * Proxy miniatures YouTube (évite blocages Chrome / referrer sur i.ytimg.com).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!ID_RE.test(id)) {
    return new NextResponse('Invalid id', { status: 400 });
  }

  for (const url of SOURCES(id)) {
    try {
      const upstream = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
        next: { revalidate: 86400 },
      });
      if (!upstream.ok) continue;
      const buffer = await upstream.arrayBuffer();
      // Placeholder YouTube ~120×90 ≈ quelques Ko ; hqdefault ≈ 20–40 Ko
      if (buffer.byteLength < 2_000) continue;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    } catch {
      // essayer la source suivante
    }
  }

  return new NextResponse('Thumbnail unavailable', { status: 404 });
}
