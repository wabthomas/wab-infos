import { NextResponse } from 'next/server';
import {
  deleteEditorArticle,
  getEditorArticle,
  isLiveRedactionArticle,
  RedactionAuthError,
  requireRedactionUser,
  updateEditorArticle,
} from '@/lib/redaction/strapi-editor';
import { triggerReaderPushOnPublish } from '@/lib/redaction/trigger-reader-push';
import type { ArticleEditorPayload } from '@/lib/redaction/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireRedactionUser();
    const { id } = await context.params;
    const article = await getEditorArticle(user, id);
    if (!article) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
    }
    return NextResponse.json({ article });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await requireRedactionUser();
    const { id } = await context.params;
    const body = (await request.json()) as Partial<ArticleEditorPayload>;
    const article = await updateEditorArticle(user, id, body);
    if (body.publish && isLiveRedactionArticle(article)) {
      void triggerReaderPushOnPublish(article.slug);
    }
    return NextResponse.json({ article });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Mise à jour impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireRedactionUser();
    const { id } = await context.params;
    await deleteEditorArticle(user, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      const status = err.message.includes('supprim') ? 403 : 401;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : 'Suppression impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
