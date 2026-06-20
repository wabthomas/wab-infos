import { NextResponse } from 'next/server';
import {
  listEditorCategories,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

export async function GET() {
  try {
    await requireRedactionUser();
    const categories = await listEditorCategories();
    return NextResponse.json({ categories });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Rubriques indisponibles' }, { status: 500 });
  }
}
