import { NextResponse } from 'next/server';
import { saveReaderPushSubscription } from '@/lib/push/subscriptions';
import type { PushSubscriptionKeys } from '@/lib/push/subscriptions';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { subscription?: PushSubscriptionKeys };
    const subscription = body.subscription;

    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 });
    }

    if (!subscription.endpoint.startsWith('https://')) {
      return NextResponse.json({ error: 'Endpoint invalide' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') ?? undefined;
    await saveReaderPushSubscription(subscription, userAgent);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[push/subscribe]', error);
    const message = error instanceof Error ? error.message : 'Abonnement impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
