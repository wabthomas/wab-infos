import { requireEditorialUser } from '@/lib/redaction/editorial-access';
import { NextResponse } from 'next/server';
import { reformulateImportedArticle } from '@/lib/ai/reformulate-import';
import {
  isRedactionSuperAdmin,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

export async function POST(request: Request) {
  try {
    const user = await requireEditorialUser();
    if (!isRedactionSuperAdmin(user)) {
      return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
    }
    const body = (await request.json()) as { documentId?: string; force?: boolean };
    if (!body.documentId?.trim()) {
      return NextResponse.json({ error: 'documentId requis' }, { status: 400 });
    }
    const result = await reformulateImportedArticle(body.documentId.trim(), {
      force: body.force === true,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Reformulation impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
