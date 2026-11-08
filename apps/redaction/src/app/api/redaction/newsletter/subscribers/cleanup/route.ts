import { requireEditorialUser } from '@/lib/redaction/editorial-access';
import { NextResponse } from 'next/server';
import { cleanNewsletterSubscribers } from '@/lib/redaction/newsletter-cleanup';
import { isRedactionSuperAdmin, RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';

export async function POST(request: Request) {
  try {
    const user = await requireEditorialUser();
    if (!isRedactionSuperAdmin(user)) {
      return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
    }
    let body: { deleteInvalid?: boolean } = {};
    try { body = (await request.json()) as { deleteInvalid?: boolean }; } catch { /* corps vide accepté */ }
    const report = await cleanNewsletterSubscribers({ deleteInvalid: body.deleteInvalid !== false });
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Nettoyage impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
