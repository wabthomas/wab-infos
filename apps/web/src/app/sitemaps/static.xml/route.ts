import { NextResponse } from 'next/server';
import { buildStaticSitemapXml, SITEMAP_RESPONSE_HEADERS } from '@/lib/sitemap-data';

export const revalidate = 3600;

export async function GET() {
  try {
    const xml = await buildStaticSitemapXml();
    return new NextResponse(xml, { headers: SITEMAP_RESPONSE_HEADERS });
  } catch {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`,
      { status: 503, headers: { ...SITEMAP_RESPONSE_HEADERS, 'Cache-Control': 'no-store', 'Retry-After': '300' } }
    );
  }
}
