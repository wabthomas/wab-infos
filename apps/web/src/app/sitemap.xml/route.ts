import { NextResponse } from 'next/server';
import { buildSitemapIndexXml, SITEMAP_RESPONSE_HEADERS } from '@/lib/sitemap-data';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  try {
    const xml = await buildSitemapIndexXml();
    return new NextResponse(xml, { headers: SITEMAP_RESPONSE_HEADERS });
  } catch {
    const empty = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</sitemapindex>`;
    return new NextResponse(empty, { status: 200, headers: SITEMAP_RESPONSE_HEADERS });
  }
}
