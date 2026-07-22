import { NextResponse } from 'next/server';
import { searchArticles } from '@/lib/strapi';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);
  const pageSize = Math.min(24, Math.max(1, Number(searchParams.get('pageSize') || 12) || 12));

  if (!q) {
    return NextResponse.json(
      { articles: [], pagination: { page: 1, pageCount: 0, total: 0, pageSize } },
      { status: 200 }
    );
  }

  try {
    const { articles, pagination } = await searchArticles(q, page, pageSize);

    return NextResponse.json(
      { articles, pagination: { ...pagination, page, pageSize } },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('[api/search/articles]', q, error);
    return NextResponse.json({ error: 'Impossible de charger les résultats' }, { status: 500 });
  }
}
