import { NextResponse } from 'next/server';
import {
  listRedactionAuthors,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

export async function GET() {
  try {
    const user = await requireRedactionUser();
    const authors = await listRedactionAuthors(user);
    return NextResponse.json({ authors });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      const status = err.message.includes('Accès') ? 403 : 401;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
