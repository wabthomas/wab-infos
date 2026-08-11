import { NextResponse } from 'next/server';
import { RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';
import {
  listPushSubscriptionsForUser,
  notifyEditorsByEmail,
  savePushSubscription,
} from '@/lib/redaction/web-push';

export async function POST(request: Request) {
  try {
    const user = await requireRedactionUser();
    const body = (await request.json()) as { fcmToken?: string };

    const fcmToken = body.fcmToken?.trim();
    if (!fcmToken || fcmToken.length < 20) {
      return NextResponse.json({ error: 'Token FCM invalide' }, { status: 400 });
    }

    const existing = await listPushSubscriptionsForUser(user.email).catch(() => []);
    const firstDevice = existing.length === 0;

    await savePushSubscription(user.email, fcmToken);

    if (firstDevice) {
      void notifyEditorsByEmail([user.email], {
        title: 'Félicitations !',
        body: 'Les notifications sont activées. Vous serez alerté des commentaires, rappels d’écriture et succès de vos articles.',
        url: '/',
      }).catch((err) => console.warn('[push/subscribe] welcome failed', err));
    }

    return NextResponse.json({ ok: true, welcome: firstDevice });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Abonnement impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
