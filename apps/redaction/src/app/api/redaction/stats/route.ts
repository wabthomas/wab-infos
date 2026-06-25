import { NextResponse } from 'next/server';
import {
  getEditorStats,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

export async function GET() {
  try {
    const user = await requireRedactionUser();
    const stats = await getEditorStats(user);
    return NextResponse.json({ stats });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Stats indisponibles' }, { status: 500 });
  }
}
