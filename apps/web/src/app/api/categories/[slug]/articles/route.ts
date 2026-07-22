import { NextResponse } from 'next/server';
import { isValidCategorySlug } from '@/config/site';
import { getArticles } from '@/lib/strapi';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { slug } = await params;

  if (!isValidCategorySlug(slug)) {
    return NextResponse.json({ error: 'Rubrique inconnue' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);
  const pageSize = Math.min(24, Math.max(1, Number(searchParams.get('pageSize') || 12) || 12));

  try {
    const { articles, pagination } = await getArticles({
      category: slug,
      page,
      pageSize,
    });

    return NextResponse.json(
      { articles, pagination: { ...pagination, page, pageSize } },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('[api/categories/articles]', slug, error);
    return NextResponse.json({ error: 'Impossible de charger les articles' }, { status: 500 });
  }
}
