import { NextResponse } from 'next/server';
import {
  detectFontFormatFromMime,
  detectFontFormatFromName,
} from '@wab-infos/shared';
import {
  RedactionAuthError,
  requireRedactionUser,
  uploadEditorFile,
} from '@/lib/redaction/strapi-editor';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FONT_BYTES = 5 * 1024 * 1024;

const ALLOWED_EXT = /\.(ttf|otf|woff2?)$/i;

function formDataFile(raw: FormDataEntryValue | null): File | null {
  return raw instanceof File ? raw : null;
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

    if (!ALLOWED_EXT.test(file.name)) {
      return NextResponse.json(
        { error: 'Formats acceptés : .ttf, .otf, .woff, .woff2' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FONT_BYTES) {
      return NextResponse.json(
        { error: 'Police trop volumineuse (max 5 Mo)' },
        { status: 400 }
      );
    }

    const format =
      detectFontFormatFromName(file.name) ??
      detectFontFormatFromMime(file.type) ??
      null;
    if (!format) {
      return NextResponse.json({ error: 'Format de police non reconnu' }, { status: 400 });
    }

    const mimeByFormat: Record<string, string> = {
      truetype: 'font/ttf',
      opentype: 'font/otf',
      woff: 'font/woff',
      woff2: 'font/woff2',
    };

    const named = new File([await file.arrayBuffer()], file.name, {
      type: file.type && file.type !== 'application/octet-stream'
        ? file.type
        : mimeByFormat[format],
    });

    const media = await uploadEditorFile(user, named);
    return NextResponse.json({
      media: {
        id: media.id,
        url: media.url,
        name: media.name ?? file.name,
        mime: media.mime ?? named.type,
        format,
      },
    });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Upload échoué';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
