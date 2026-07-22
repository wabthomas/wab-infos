import { NextResponse } from 'next/server';
import { buildArticlesSitemapXml, SITEMAP_RESPONSE_HEADERS } from '@/lib/sitemap-data';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

interface RouteContext {
  params: Promise<{ chunk: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { chunk: chunkParam } = await context.params;
  const chunkIndex = Number.parseInt(chunkParam, 10);

  if (!Number.isFinite(chunkIndex) || chunkIndex < 0) {
    return new NextResponse('Not Found', { status: 404 });
  }

  try {
    const xml = await buildArticlesSitemapXml(chunkIndex);
    return new NextResponse(xml, { headers: SITEMAP_RESPONSE_HEADERS });
  } catch {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`,
      { status: 200, headers: SITEMAP_RESPONSE_HEADERS }
    );
  }
}
