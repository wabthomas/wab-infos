import { NextResponse } from 'next/server';
import {
  RedactionAuthError,
  requireRedactionUser,
  updateEditorMedia,
} from '@/lib/redaction/strapi-editor';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireRedactionUser();
    const { id } = await context.params;
    const mediaId = Number(id);
    if (!Number.isFinite(mediaId)) {
      return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
    }

    const body = (await request.json()) as {
      alternativeText?: string;
      caption?: string;
    };

    const media = await updateEditorMedia(mediaId, {
      alternativeText: body.alternativeText?.trim(),
      caption: body.caption?.trim(),
    });

    return NextResponse.json({ media });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Mise à jour impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
