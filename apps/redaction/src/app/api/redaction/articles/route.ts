import { NextResponse } from 'next/server';
import {
  createEditorArticle,
  isLiveRedactionArticle,
  listEditorArticles,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';
import { triggerReaderPushOnPublish } from '@/lib/redaction/trigger-reader-push';
import type { ArticleEditorPayload } from '@/lib/redaction/types';
import { excerptFromContent } from '@/lib/utils';

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
    const content = body.content?.trim() || '<p></p>';
    const excerpt =
      body.excerpt?.trim() || excerptFromContent(content, 170) || body.title?.trim().slice(0, 170);

    if (body.draftOnly) {
      if (!body.title?.trim() && !body.content?.trim()) {
        return NextResponse.json({ error: 'Titre ou contenu requis pour le brouillon' }, { status: 400 });
      }
      if (!body.categoryDocumentIds?.length) {
        return NextResponse.json({ error: 'Au moins une rubrique est requise' }, { status: 400 });
      }
    } else {
      if (!body.title?.trim() || !excerpt || !content.replace(/<[^>]+>/g, '').trim()) {
        return NextResponse.json({ error: 'Titre, chapô et contenu requis' }, { status: 400 });
      }
      if (!body.categoryDocumentIds?.length) {
        return NextResponse.json({ error: 'Au moins une rubrique est requise' }, { status: 400 });
      }
    }

    const article = await createEditorArticle(user, {
      ...body,
      content,
      excerpt: excerpt || 'Brouillon',
      draftOnly: body.draftOnly ?? false,
      publish: body.draftOnly ? false : body.publish,
      scheduledAt: body.draftOnly ? null : body.scheduledAt,
    });
    if (body.publish && !body.draftOnly && isLiveRedactionArticle(article)) {
      void triggerReaderPushOnPublish(article.slug);
    }
    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Création impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
