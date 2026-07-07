import { NextResponse } from 'next/server';
import { saveReaderPushSubscription } from '@/lib/push/subscriptions';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { fcmToken?: string; platform?: string };
    const fcmToken = body.fcmToken?.trim();

    if (!fcmToken || fcmToken.length < 20) {
      return NextResponse.json({ error: 'Token FCM invalide' }, { status: 400 });
    }

    const baseUa = request.headers.get('user-agent') ?? '';
    const platformTag =
      body.platform === 'android' ? 'Capacitor-Android' : body.platform === 'ios' ? 'Capacitor-iOS' : '';
    const userAgent = [baseUa, platformTag].filter(Boolean).join(' | ') || undefined;
    await saveReaderPushSubscription(fcmToken, userAgent);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[push/subscribe]', error);
    const message = error instanceof Error ? error.message : 'Abonnement impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
