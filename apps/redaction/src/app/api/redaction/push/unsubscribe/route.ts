import { NextResponse } from 'next/server';
import { RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';
import { deletePushSubscriptionsForUser } from '@/lib/redaction/web-push';

export async function POST() {
  try {
    const user = await requireRedactionUser();
    const removed = await deletePushSubscriptionsForUser(user.email);
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Désabonnement impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
