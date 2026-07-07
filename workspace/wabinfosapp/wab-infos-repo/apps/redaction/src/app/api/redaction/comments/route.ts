import { NextResponse } from 'next/server';
import {
  listEditorComments,
  moderateEditorComment,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

export async function GET(request: Request) {
  try {
    await requireRedactionUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as
      | 'pending'
      | 'approved'
      | 'rejected'
      | 'all'
      | null;
    const comments = await listEditorComments(status ?? 'pending');
    return NextResponse.json({ comments });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Impossible de charger les commentaires' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRedactionUser();
    const body = (await request.json()) as {
      documentId?: string;
      status?: 'approved' | 'rejected';
    };

    if (!body.documentId || !body.status) {
      return NextResponse.json({ error: 'documentId et status requis' }, { status: 400 });
    }

    const comment = await moderateEditorComment(body.documentId, body.status);
    return NextResponse.json({ comment });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Modération impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
