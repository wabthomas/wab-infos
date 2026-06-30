import { NextResponse } from 'next/server';
import {
  isLiveRedactionArticle,
  RedactionAuthError,
  requireRedactionUser,
  setEditorArticlePublication,
} from '@/lib/redaction/strapi-editor';
import { triggerReaderPushOnPublish } from '@/lib/redaction/trigger-reader-push';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireRedactionUser();
    const { id } = await context.params;
    const body = (await request.json()) as { publish?: boolean };
    if (typeof body.publish !== 'boolean') {
      return NextResponse.json({ error: 'Champ publish requis' }, { status: 400 });
    }

    const article = await setEditorArticlePublication(user, id, body.publish);
    if (body.publish && isLiveRedactionArticle(article)) {
      void triggerReaderPushOnPublish(article.slug);
    }
    return NextResponse.json({ article });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      const status = err.message.includes('réservé') ? 403 : 401;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : 'Action impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
