import { NextResponse } from 'next/server';
import {
  getEditorProfile,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

export async function GET() {
  try {
    const user = await requireRedactionUser();
    const profile = await getEditorProfile(user);
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
