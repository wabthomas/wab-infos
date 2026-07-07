import { NextResponse } from 'next/server';
import { RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';
import { savePushSubscription } from '@/lib/redaction/web-push';

export async function POST(request: Request) {
  try {
    const user = await requireRedactionUser();
    const body = (await request.json()) as { fcmToken?: string };

    const fcmToken = body.fcmToken?.trim();
    if (!fcmToken || fcmToken.length < 20) {
      return NextResponse.json({ error: 'Token FCM invalide' }, { status: 400 });
    }

    await savePushSubscription(user.email, fcmToken);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Abonnement impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
