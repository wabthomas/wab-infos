import { NextResponse } from 'next/server';
import { toggleArticleLike } from '@/lib/strapi';

interface RouteContext {
  params: Promise<{ documentId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { documentId } = await context.params;

  if (!documentId) {
    return NextResponse.json({ error: 'documentId requis' }, { status: 400 });
  }

  let liked = true;
  try {
    const body = (await request.json()) as { liked?: boolean };
    liked = body.liked !== false;
  } catch {
    // défaut : like
  }

  try {
    const result = await toggleArticleLike(documentId, liked);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[likes]', documentId, error);
    return NextResponse.json({ error: 'Compteur indisponible' }, { status: 500 });
  }
}
