import { NextResponse } from 'next/server';
import { createPublicComment } from '@/lib/redaction/strapi-editor';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      content?: string;
      authorName?: string;
      authorEmail?: string;
      articleDocumentId?: string;
    };

    if (!body.content?.trim() || !body.authorName?.trim() || !body.authorEmail?.trim()) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }
    if (!body.articleDocumentId) {
      return NextResponse.json({ error: 'Article requis' }, { status: 400 });
    }

    const email = body.authorEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'E-mail invalide' }, { status: 400 });
    }

    await createPublicComment({
      content: body.content,
      authorName: body.authorName,
      authorEmail: email,
      articleDocumentId: body.articleDocumentId,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Envoi impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
