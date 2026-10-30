import { requireEditorialUser } from '@/lib/redaction/editorial-access';
import { NextResponse } from 'next/server';
import { sendNewsletterTest } from '@/lib/redaction/newsletter-admin';
import {
  isRedactionSuperAdmin,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

export async function POST(request: Request) {
  try {
    const user = await requireEditorialUser();
    if (!isRedactionSuperAdmin(user)) {
      return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
    }

    const body = (await request.json()) as { to?: string };
    await sendNewsletterTest(body.to || '');
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Test impossible';
    console.error('[newsletter-test]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
