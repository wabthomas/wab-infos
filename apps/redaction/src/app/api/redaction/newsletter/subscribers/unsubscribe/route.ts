import { NextResponse } from 'next/server';
import { unsubscribeNewsletterSubscriber } from '@/lib/redaction/newsletter-admin';
import {
  isRedactionSuperAdmin,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

export async function POST(request: Request) {
  try {
    const user = await requireRedactionUser();
    if (!isRedactionSuperAdmin(user)) {
      return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
    }

    const body = (await request.json()) as { documentId?: string; notify?: boolean };
    const documentId = body.documentId?.trim();
    if (!documentId) {
      return NextResponse.json({ error: 'Abonné manquant.' }, { status: 400 });
    }

    const result = await unsubscribeNewsletterSubscriber(documentId, {
      notify: body.notify !== false,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Désinscription impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
