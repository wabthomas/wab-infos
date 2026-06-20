import { NextResponse } from 'next/server';
import { incrementArticleViews } from '@/lib/strapi';

interface RouteContext {
  params: Promise<{ documentId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { documentId } = await context.params;

  if (!documentId) {
    return NextResponse.json({ error: 'documentId requis' }, { status: 400 });
  }

  try {
    const result = await incrementArticleViews(documentId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Compteur indisponible' }, { status: 500 });
  }
}
