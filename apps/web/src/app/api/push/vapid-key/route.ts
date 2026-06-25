import { NextResponse } from 'next/server';
import { getFirebaseClientConfig, getFirebaseVapidKey } from '@/lib/firebase/config';

export async function GET() {
  const config = getFirebaseClientConfig();
  const vapidKey = getFirebaseVapidKey();

  if (!config || !vapidKey) {
    return NextResponse.json({ error: 'Firebase non configuré' }, { status: 503 });
  }

  return NextResponse.json({
    ...config,
    vapidKey,
    publicKey: vapidKey,
  });
}
