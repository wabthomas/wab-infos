import { NextResponse } from 'next/server';
import {
  listEditorMedia,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

export async function GET(request: Request) {
  try {
    await requireRedactionUser();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
    const pageSize = Math.min(48, Math.max(12, Number(searchParams.get('pageSize') ?? '24') || 24));
    const search = searchParams.get('q') ?? undefined;

    const result = await listEditorMedia({ page, pageSize, search });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Médiathèque indisponible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
