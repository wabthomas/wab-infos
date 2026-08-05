import { NextResponse } from 'next/server';
import { getArticles } from '@/lib/strapi';
import { resolveArticleImageUrl } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(12, Math.max(4, Number(searchParams.get('limit') || 6) || 6));

  try {
    const { articles } = await getArticles({ pageSize: limit });
    const items = articles.slice(0, limit).map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      categorySlug: article.category?.slug ?? 'actualite',
      excerpt: article.excerpt,
      imageUrl: resolveArticleImageUrl(article.featuredImage, 'card'),
    }));

    return NextResponse.json(
      { articles: items },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('[api/search/discover]', error);
    return NextResponse.json({ articles: [] }, { status: 200 });
  }
}
