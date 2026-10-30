import { requireEditorialUser } from '@/lib/redaction/editorial-access';
import { NextResponse } from 'next/server';
import {
  runEditorChatTurn,
  type EditorArticleSnapshot,
  type EditorChatAttachment,
  type EditorChatHistoryMessage,
} from '@/lib/ai/editor-chat';
import { RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    await requireEditorialUser();
    const body = (await request.json()) as {
      message?: string;
      history?: EditorChatHistoryMessage[];
      article?: EditorArticleSnapshot;
      attachments?: EditorChatAttachment[];
    };

    const message = body.message?.trim() || '';
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    if (!message && attachments.length === 0) {
      return NextResponse.json({ error: 'Message ou photo requis' }, { status: 400 });
    }

    const result = await runEditorChatTurn({
      message,
      history: Array.isArray(body.history) ? body.history.slice(-12) : [],
      article: body.article || {},
      attachments: attachments
        .filter((item) => item && Number(item.mediaId) > 0 && typeof item.url === 'string')
        .map((item) => ({
          mediaId: Number(item.mediaId),
          url: item.url,
          alternativeText: item.alternativeText ?? null,
          name: item.name,
        })),
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Chat IA impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
