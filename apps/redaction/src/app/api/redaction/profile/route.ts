import { NextResponse } from 'next/server';
import {
  getEditorProfile,
  RedactionAuthError,
  requireRedactionUser,
  updateEditorAuthorProfile,
} from '@/lib/redaction/strapi-editor';
import type { EditorAuthorProfilePayload } from '@/lib/redaction/types';

export async function GET() {
  try {
    const user = await requireRedactionUser();
    const profile = await getEditorProfile(user);
    return NextResponse.json({
      user: profile.user,
      author: profile.author,
      isSuperAdmin: profile.isSuperAdmin,
    });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireRedactionUser();
    const body = (await request.json()) as EditorAuthorProfilePayload;
    const author = await updateEditorAuthorProfile(user, body);
    return NextResponse.json({ author });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      const status =
        err.message.includes('requis') ||
        err.message.includes('trop') ||
        err.message.includes('invalide') ||
        err.message.includes('déjà pris') ||
        err.message.includes('lettres')
          ? 400
          : 401;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : 'Mise à jour impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
