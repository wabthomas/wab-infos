import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { incrementArticleViews } from '@/lib/strapi';

interface RouteContext {
  params: Promise<{ documentId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { documentId } = await context.params;

  if (!documentId) {
    return NextResponse.json({ error: 'documentId requis' }, { status: 400 });
  }

  let slug: string | undefined;
  let category: string | undefined;
  try {
    const body = (await request.json()) as { slug?: string; category?: string };
    slug = body.slug;
    category = body.category;
  } catch {
    // body optionnel
  }

  try {
    const result = await incrementArticleViews(documentId);

    if (slug && category) {
      revalidatePath(`/${category}/${slug}`);
      revalidatePath('/');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[views]', documentId, error);
    return NextResponse.json({ error: 'Compteur indisponible' }, { status: 500 });
  }
}
