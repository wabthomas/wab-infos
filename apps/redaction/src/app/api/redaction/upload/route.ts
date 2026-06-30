import { NextResponse } from 'next/server';
import { assertUploadableImage, optimizeUploadImage } from '@/lib/redaction/optimize-upload-image';
import {
  RedactionAuthError,
  requireRedactionUser,
  uploadEditorImage,
} from '@/lib/redaction/strapi-editor';

export const runtime = 'nodejs';
export const maxDuration = 60;

function formDataFile(raw: FormDataEntryValue | null): File | null {
  if (!raw || typeof raw === 'string' || !(raw instanceof Blob)) {
    return null;
  }
  if (raw instanceof File) {
    return raw;
  }
  const blob: Blob = raw;
  const type = blob.type || 'application/octet-stream';
  const name = type.startsWith('image/') ? `upload.${type.split('/')[1] ?? 'jpg'}` : 'upload.jpg';
  return new File([blob], name, { type });
}

export async function POST(request: Request) {
  try {
    const user = await requireRedactionUser();
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Fichier trop volumineux ou requête invalide' },
        { status: 413 }
      );
    }

    const file = formDataFile(form.get('file'));
    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    }

    await assertUploadableImage(file);

    const optimized = await optimizeUploadImage(file);
    const media = await uploadEditorImage(user, optimized);
    return NextResponse.json({ media });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Upload échoué';
    const clientError =
      message === 'Image uniquement' ||
      message === 'Format d’image non reconnu' ||
      message.startsWith('Image trop volumineuse');
    return NextResponse.json({ error: message }, { status: clientError ? 400 : 500 });
  }
}
