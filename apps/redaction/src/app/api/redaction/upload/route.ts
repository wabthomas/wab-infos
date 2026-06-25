import { NextResponse } from 'next/server';
import {
  RedactionAuthError,
  requireRedactionUser,
  uploadEditorImage,
} from '@/lib/redaction/strapi-editor';

export async function POST(request: Request) {
  try {
    const user = await requireRedactionUser();
    const form = await request.formData();
    const file = form.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Image uniquement' }, { status: 400 });
    }

    const media = await uploadEditorImage(user, file);
    return NextResponse.json({ media });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Upload échoué';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
