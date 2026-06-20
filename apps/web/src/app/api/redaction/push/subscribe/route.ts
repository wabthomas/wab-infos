import { NextResponse } from 'next/server';
import { RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';
import type { PushSubscriptionPayload } from '@/lib/redaction/types';
import { savePushSubscription } from '@/lib/redaction/web-push';

export async function POST(request: Request) {
  try {
    const user = await requireRedactionUser();
    const body = (await request.json()) as { subscription?: PushSubscriptionPayload };

    if (!body.subscription?.endpoint || !body.subscription.keys) {
      return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 });
    }

    await savePushSubscription(user.email, body.subscription);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Abonnement impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
