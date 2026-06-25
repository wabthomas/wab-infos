import { NextResponse } from 'next/server';
import { getFirebaseVapidKey } from '@/lib/firebase/config';

export async function GET() {
  const publicKey = getFirebaseVapidKey();
  if (!publicKey) {
    return NextResponse.json({ error: 'Firebase non configuré' }, { status: 503 });
  }
  return NextResponse.json({ publicKey, vapidKey: publicKey });
}
