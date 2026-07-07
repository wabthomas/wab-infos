import { NextResponse } from 'next/server';
import { buildMainSitemapXml } from '@/lib/sitemap-data';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  const xml = await buildMainSitemapXml();

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=1800, s-maxage=3600',
    },
  });
}
