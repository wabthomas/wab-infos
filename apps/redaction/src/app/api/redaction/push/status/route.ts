import { NextResponse } from 'next/server';
import {
  isFirebaseAdminConfigured,
  getFirebaseClientConfig,
  getFirebaseVapidKey,
} from '@/lib/firebase/config';
import { RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';
import { listPushSubscriptionsForUser } from '@/lib/redaction/web-push';

export async function GET() {
  try {
    const user = await requireRedactionUser();
    const clientConfigured = Boolean(getFirebaseClientConfig() && getFirebaseVapidKey());
    const serverConfigured = isFirebaseAdminConfigured();

    let subscribed = false;
    let deviceCount = 0;
    let subscriptionError: string | null = null;
    try {
      const subs = await listPushSubscriptionsForUser(user.email);
      subscribed = subs.length > 0;
      deviceCount = subs.length;
    } catch (err) {
      subscriptionError = err instanceof Error ? err.message : 'Lecture abonnements impossible';
    }

    return NextResponse.json({
      subscribed,
      deviceCount,
      clientConfigured,
      serverConfigured,
      /** Peut activer l’abonnement appareil (token FCM). L’envoi admin est séparé. */
      pushReady: clientConfigured,
      canSend: serverConfigured,
      subscriptionError,
    });
  } catch (err) {
    if (err instanceof RedactionAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Statut indisponible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
