import { NextResponse } from 'next/server';
import { saveReaderPushSubscription } from '@/lib/push/subscriptions';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { fcmToken?: string };
    const fcmToken = body.fcmToken?.trim();

    if (!fcmToken || fcmToken.length < 20) {
      return NextResponse.json({ error: 'Token FCM invalide' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') ?? undefined;
    await saveReaderPushSubscription(fcmToken, userAgent);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[push/subscribe]', error);
    const message = error instanceof Error ? error.message : 'Abonnement impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
