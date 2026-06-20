import { NextResponse } from 'next/server';
import {
  createEditorArticle,
  listEditorArticles,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';
import type { ArticleEditorPayload } from '@/lib/redaction/types';

export async function GET(request: Request) {
  try {
    const user = await requireRedactionUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'draft' | 'published' | 'scheduled' | 'all' | null;
    const articles = await listEditorArticles(user, status ?? 'all');
    return NextResponse.json({ articles });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Impossible de charger les articles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRedactionUser();
    const body = (await request.json()) as ArticleEditorPayload;

    if (!body.title?.trim() || !body.excerpt?.trim() || !body.content?.trim()) {
      return NextResponse.json({ error: 'Titre, chapô et contenu requis' }, { status: 400 });
    }
    if (!body.categoryDocumentId) {
      return NextResponse.json({ error: 'Rubrique requise' }, { status: 400 });
    }

    const article = await createEditorArticle(user, body);
    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Création impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
